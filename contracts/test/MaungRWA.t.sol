// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MaungRWA.sol";

contract MaungRWATest is Test {
    MaungRWA public rwa;

    address owner   = address(this);
    address feeAddr = makeAddr("fee");
    address alice   = makeAddr("alice");
    address bob     = makeAddr("bob");

    // 1,500 fractions × 0.025 ether = 37.5 ETH total
    uint256 constant TOTAL_FRACTIONS = 1_500;
    uint256 constant FRACTION_PRICE  = 0.025 ether;
    uint256 constant TOTAL_VALUE     = TOTAL_FRACTIONS * FRACTION_PRICE;
    uint256 constant APY_BPS         = 1_420; // 14.20%
    uint256 constant MATURITY        = 730 days;

    function setUp() public {
        rwa = new MaungRWA(feeAddr);

        // Fund test users
        vm.deal(alice, 100 ether);
        vm.deal(bob,   100 ether);
        vm.deal(owner, 100 ether);
    }

    // ─── createAsset ─────────────────────────────────────────────────────────

    function test_CreateAsset() public {
        uint256 id = _createAlphard();
        MaungRWA.Asset memory a = rwa.getAsset(id);

        assertEq(a.name, "Toyota Alphard 2023");
        assertEq(a.totalFractions, TOTAL_FRACTIONS);
        assertEq(a.fractionPrice, FRACTION_PRICE);
        assertEq(uint8(a.status), uint8(MaungRWA.AssetStatus.FUNDING));
    }

    function test_CreateAsset_PriceMismatch_Reverts() public {
        vm.expectRevert("Price mismatch");
        rwa.createAsset(
            "Bad Asset", "Yangon",
            MaungRWA.AssetType.VEHICLE,
            100 ether,  // totalValue
            1 ether,    // fractionPrice
            50,         // totalFractions  (1 * 50 ≠ 100)
            1000,
            365 days
        );
    }

    // ─── mintFractions ────────────────────────────────────────────────────────

    function test_MintFractions_Success() public {
        uint256 id = _createAlphard();
        uint256 amount = 10;
        uint256 cost   = FRACTION_PRICE * amount;
        uint256 fee    = cost / 100; // 1%

        vm.prank(alice);
        rwa.mintFractions{value: cost + fee}(id, amount);

        assertEq(rwa.balanceOf(alice, id), amount);
        assertEq(rwa.getAsset(id).soldFractions, amount);
    }

    function test_MintFractions_ExcessRefund() public {
        uint256 id     = _createAlphard();
        uint256 amount = 5;
        uint256 cost   = FRACTION_PRICE * amount;
        uint256 fee    = cost / 100;
        uint256 extra  = 1 ether;

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        rwa.mintFractions{value: cost + fee + extra}(id, amount);

        // Alice gets refunded the extra
        assertApproxEqAbs(alice.balance, balBefore - cost - fee, 1e15);
    }

    function test_MintFractions_InsufficientETH_Reverts() public {
        uint256 id = _createAlphard();
        vm.prank(alice);
        vm.expectRevert("Insufficient ETH");
        rwa.mintFractions{value: 0.001 ether}(id, 10);
    }

    function test_MintFractions_FullFunding_ChangesStatus() public {
        uint256 id = _createAlphard();
        uint256 cost = FRACTION_PRICE * TOTAL_FRACTIONS;
        uint256 fee  = cost / 100;

        vm.prank(alice);
        rwa.mintFractions{value: cost + fee}(id, TOTAL_FRACTIONS);

        assertEq(uint8(rwa.getAsset(id).status), uint8(MaungRWA.AssetStatus.ACTIVE));
        assertEq(rwa.getAsset(id).soldFractions, TOTAL_FRACTIONS);
    }

    // ─── distributeYield ──────────────────────────────────────────────────────

    function test_DistributeYield_Success() public {
        uint256 id = _fullyFund(alice);

        uint256 yieldAmount = 1 ether;
        rwa.distributeYield{value: yieldAmount}(id, "April rent");

        MaungRWA.YieldDistribution[] memory hist = rwa.getYieldHistory(id);
        assertEq(hist.length, 1);
        assertEq(hist[0].amount, yieldAmount);
        assertEq(hist[0].perFraction, yieldAmount / TOTAL_FRACTIONS);
    }

    function test_DistributeYield_NotActive_Reverts() public {
        uint256 id = _createAlphard(); // still FUNDING
        vm.expectRevert("Asset not active");
        rwa.distributeYield{value: 1 ether}(id, "test");
    }

    // ─── claimYield ──────────────────────────────────────────────────────────

    function test_ClaimYield_Success() public {
        uint256 id = _fullyFund(alice); // alice holds all fractions

        uint256 yieldAmount = 1.5 ether;
        rwa.distributeYield{value: yieldAmount}(id, "Q1 yield");

        uint256 pending = rwa.pendingYield(id, alice);
        assertEq(pending, yieldAmount); // alice holds 100%

        uint256 balBefore = alice.balance;
        vm.prank(alice);
        rwa.claimYield(id);

        assertApproxEqAbs(alice.balance, balBefore + yieldAmount, 1e12);
    }

    function test_ClaimYield_MultipleDists() public {
        uint256 id = _fullyFund(alice);

        rwa.distributeYield{value: 1 ether}(id, "dist1");
        rwa.distributeYield{value: 0.5 ether}(id, "dist2");

        // 1e18 / 1500 and 0.5e18 / 1500 each lose dust due to integer division.
        // Max dust = 1 wei per fraction per distribution = 2 * 1500 = 3000 wei.
        uint256 pending = rwa.pendingYield(id, alice);
        assertApproxEqAbs(pending, 1.5 ether, 3000);

        vm.prank(alice);
        rwa.claimYield(id);

        // After claim, pending = 0
        assertEq(rwa.pendingYield(id, alice), 0);
    }

    function test_ClaimYield_NoFractions_Reverts() public {
        uint256 id = _fullyFund(alice);
        rwa.distributeYield{value: 1 ether}(id, "yield");

        vm.prank(bob); // bob has no fractions
        vm.expectRevert("No fractions held");
        rwa.claimYield(id);
    }

    // ─── matureAsset ─────────────────────────────────────────────────────────

    function test_MatureAsset_Success() public {
        uint256 id = _fullyFund(alice);
        vm.warp(block.timestamp + MATURITY + 1);
        rwa.matureAsset(id);
        assertEq(uint8(rwa.getAsset(id).status), uint8(MaungRWA.AssetStatus.MATURED));
    }

    function test_MatureAsset_TooEarly_Reverts() public {
        uint256 id = _fullyFund(alice);
        vm.expectRevert("Not yet matured");
        rwa.matureAsset(id);
    }

    // ─── Fee ─────────────────────────────────────────────────────────────────

    function test_ProtocolFee_SentToFeeRecipient() public {
        uint256 id     = _createAlphard();
        uint256 amount = 10;
        uint256 cost   = FRACTION_PRICE * amount;
        uint256 fee    = cost / 100;

        uint256 feeBefore = feeAddr.balance;

        vm.prank(alice);
        rwa.mintFractions{value: cost + fee}(id, amount);

        assertEq(feeAddr.balance, feeBefore + fee);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function _createAlphard() internal returns (uint256) {
        return rwa.createAsset(
            "Toyota Alphard 2023",
            "Yangon, Myanmar",
            MaungRWA.AssetType.VEHICLE,
            TOTAL_VALUE,
            FRACTION_PRICE,
            TOTAL_FRACTIONS,
            APY_BPS,
            MATURITY
        );
    }

    function _fullyFund(address buyer) internal returns (uint256 id) {
        id = _createAlphard();
        uint256 cost = FRACTION_PRICE * TOTAL_FRACTIONS;
        uint256 fee  = cost / 100;
        vm.prank(buyer);
        rwa.mintFractions{value: cost + fee}(id, TOTAL_FRACTIONS);
    }

    // Allow contract to receive ETH (for yield distributions in tests)
    receive() external payable {}
}
