// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MaungRWA
 * @notice Tokenizes real-world assets (vehicles & invoices) into ERC-1155 NFTs
 *         with fractional ownership and yield distribution.
 */
contract MaungRWA is ERC1155, Ownable, ReentrancyGuard {

    // ─── Enums ───────────────────────────────────────────────────────────────
    enum AssetType { VEHICLE, INVOICE }
    enum AssetStatus { FUNDING, ACTIVE, MATURED, CANCELLED }

    // ─── Structs ─────────────────────────────────────────────────────────────
    struct Asset {
        uint256 id;
        string  name;
        string  location;
        AssetType assetType;
        AssetStatus status;
        uint256 totalValue;       // in wei
        uint256 fractionPrice;    // price per fraction (wei)
        uint256 totalFractions;   // total supply of fractions
        uint256 soldFractions;    // how many sold so far
        uint256 apyBps;           // APY in basis points (e.g. 1420 = 14.20%)
        uint256 maturityDuration; // seconds until maturity
        uint256 createdAt;
        uint256 fundedAt;         // when fully funded
        uint256 totalYieldPaid;   // cumulative yield distributed (wei)
    }

    struct YieldDistribution {
        uint256 assetId;
        uint256 amount;           // total yield in this round (wei)
        uint256 perFraction;      // yield per fraction (wei)
        uint256 timestamp;
        string  note;
    }

    // ─── State ────────────────────────────────────────────────────────────────
    uint256 public nextAssetId;
    uint256 public protocolFeeBps = 100; // 1%
    address public feeRecipient;

    mapping(uint256 => Asset) public assets;

    // assetId => distributionIndex => YieldDistribution
    mapping(uint256 => YieldDistribution[]) public yieldHistory;

    // assetId => holder => lastClaimedIndex
    mapping(uint256 => mapping(address => uint256)) public lastClaimed;

    // ─── Events ───────────────────────────────────────────────────────────────
    event AssetCreated(uint256 indexed assetId, string name, AssetType assetType, uint256 totalFractions, uint256 fractionPrice);
    event FractionMinted(uint256 indexed assetId, address indexed buyer, uint256 amount, uint256 paid);
    event AssetFullyFunded(uint256 indexed assetId);
    event YieldDistributed(uint256 indexed assetId, uint256 totalAmount, uint256 perFraction, string note);
    event YieldClaimed(uint256 indexed assetId, address indexed holder, uint256 amount);
    event AssetMatured(uint256 indexed assetId);

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _feeRecipient)
        ERC1155("https://api.maungrwa.io/metadata/{id}.json")
        Ownable(msg.sender)
    {
        feeRecipient = _feeRecipient;
    }

    // ─── Admin: Create Asset ──────────────────────────────────────────────────
    function createAsset(
        string memory _name,
        string memory _location,
        AssetType _assetType,
        uint256 _totalValue,
        uint256 _fractionPrice,
        uint256 _totalFractions,
        uint256 _apyBps,
        uint256 _maturityDuration
    ) external onlyOwner returns (uint256 assetId) {
        require(_totalFractions > 0, "Zero fractions");
        require(_fractionPrice > 0, "Zero price");
        require(_fractionPrice * _totalFractions == _totalValue, "Price mismatch");

        assetId = nextAssetId++;

        assets[assetId] = Asset({
            id: assetId,
            name: _name,
            location: _location,
            assetType: _assetType,
            status: AssetStatus.FUNDING,
            totalValue: _totalValue,
            fractionPrice: _fractionPrice,
            totalFractions: _totalFractions,
            soldFractions: 0,
            apyBps: _apyBps,
            maturityDuration: _maturityDuration,
            createdAt: block.timestamp,
            fundedAt: 0,
            totalYieldPaid: 0
        });

        emit AssetCreated(assetId, _name, _assetType, _totalFractions, _fractionPrice);
    }

    // ─── Mint Fractions ───────────────────────────────────────────────────────
    function mintFractions(uint256 _assetId, uint256 _amount)
        external
        payable
        nonReentrant
    {
        Asset storage asset = assets[_assetId];
        require(asset.status == AssetStatus.FUNDING, "Not in funding phase");
        require(_amount > 0, "Zero amount");
        require(asset.soldFractions + _amount <= asset.totalFractions, "Exceeds supply");

        uint256 cost = asset.fractionPrice * _amount;
        uint256 fee  = (cost * protocolFeeBps) / 10_000;
        uint256 total = cost + fee;
        require(msg.value >= total, "Insufficient ETH");

        // Update state
        asset.soldFractions += _amount;

        // Mint ERC-1155 fractions to buyer
        _mint(msg.sender, _assetId, _amount, "");

        // Transfer fee
        if (fee > 0) {
            (bool feeOk,) = feeRecipient.call{value: fee}("");
            require(feeOk, "Fee transfer failed");
        }

        // Refund excess
        uint256 excess = msg.value - total;
        if (excess > 0) {
            (bool refundOk,) = msg.sender.call{value: excess}("");
            require(refundOk, "Refund failed");
        }

        emit FractionMinted(_assetId, msg.sender, _amount, cost);

        // Check if fully funded
        if (asset.soldFractions == asset.totalFractions) {
            asset.status = AssetStatus.ACTIVE;
            asset.fundedAt = block.timestamp;
            emit AssetFullyFunded(_assetId);
        }
    }

    // ─── Distribute Yield (Owner pushes yield) ────────────────────────────────
    function distributeYield(uint256 _assetId, string memory _note)
        external
        payable
        onlyOwner
        nonReentrant
    {
        Asset storage asset = assets[_assetId];
        require(asset.status == AssetStatus.ACTIVE, "Asset not active");
        require(msg.value > 0, "No ETH sent");
        require(asset.soldFractions > 0, "No holders");

        uint256 perFraction = msg.value / asset.soldFractions;
        require(perFraction > 0, "Too little yield");

        yieldHistory[_assetId].push(YieldDistribution({
            assetId: _assetId,
            amount: msg.value,
            perFraction: perFraction,
            timestamp: block.timestamp,
            note: _note
        }));

        asset.totalYieldPaid += msg.value;

        emit YieldDistributed(_assetId, msg.value, perFraction, _note);
    }

    // ─── Claim Yield ──────────────────────────────────────────────────────────
    function claimYield(uint256 _assetId) external nonReentrant {
        uint256 bal = balanceOf(msg.sender, _assetId);
        require(bal > 0, "No fractions held");

        uint256 lastIdx = lastClaimed[_assetId][msg.sender];
        uint256 totalDists = yieldHistory[_assetId].length;
        require(lastIdx < totalDists, "Nothing to claim");

        uint256 owed;
        for (uint256 i = lastIdx; i < totalDists; i++) {
            owed += yieldHistory[_assetId][i].perFraction * bal;
        }

        lastClaimed[_assetId][msg.sender] = totalDists;

        (bool ok,) = msg.sender.call{value: owed}("");
        require(ok, "Claim transfer failed");

        emit YieldClaimed(_assetId, msg.sender, owed);
    }

    // ─── Mature Asset ─────────────────────────────────────────────────────────
    function matureAsset(uint256 _assetId) external onlyOwner {
        Asset storage asset = assets[_assetId];
        require(asset.status == AssetStatus.ACTIVE, "Not active");
        require(block.timestamp >= asset.fundedAt + asset.maturityDuration, "Not yet matured");
        asset.status = AssetStatus.MATURED;
        emit AssetMatured(_assetId);
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    function getAsset(uint256 _assetId) external view returns (Asset memory) {
        return assets[_assetId];
    }

    function getYieldHistory(uint256 _assetId) external view returns (YieldDistribution[] memory) {
        return yieldHistory[_assetId];
    }

    function pendingYield(uint256 _assetId, address _holder) external view returns (uint256 owed) {
        uint256 bal = balanceOf(_holder, _assetId);
        if (bal == 0) return 0;
        uint256 lastIdx = lastClaimed[_assetId][_holder];
        uint256 totalDists = yieldHistory[_assetId].length;
        for (uint256 i = lastIdx; i < totalDists; i++) {
            owed += yieldHistory[_assetId][i].perFraction * bal;
        }
    }

    function getFundingProgress(uint256 _assetId) external view returns (uint256 pct) {
        Asset storage asset = assets[_assetId];
        if (asset.totalFractions == 0) return 0;
        pct = (asset.soldFractions * 100) / asset.totalFractions;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    function setProtocolFee(uint256 _bps) external onlyOwner {
        require(_bps <= 500, "Max 5%");
        protocolFeeBps = _bps;
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Zero address");
        feeRecipient = _recipient;
    }

    function setURI(string memory _uri) external onlyOwner {
        _setURI(_uri);
    }
}
