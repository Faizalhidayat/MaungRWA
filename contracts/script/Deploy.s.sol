// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MaungRWA.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");

        vm.startBroadcast(deployerKey);

        MaungRWA rwa = new MaungRWA(feeRecipient);
        console.log("MaungRWA deployed at:", address(rwa));

        // ── Seed: Create 2 example assets ─────────────────────────────────

        // 1. Toyota Alphard 2023 — 1,500 fractions @ 0.025 ETH = 37.5 ETH
        rwa.createAsset(
            "Toyota Alphard 2023",
            "Yangon, Myanmar",
            MaungRWA.AssetType.VEHICLE,
            37.5 ether,
            0.025 ether,
            1_500,
            1_420,   // 14.20% APY
            730 days
        );
        console.log("Asset 0 created: Toyota Alphard 2023");

        // 2. MMC Trade Invoice #44 — 10,000 fractions @ 0.01 ETH = 100 ETH
        rwa.createAsset(
            "MMC Trade Invoice #44",
            "Mandalay, Myanmar",
            MaungRWA.AssetType.INVOICE,
            100 ether,
            0.01 ether,
            10_000,
            980,     // 9.80% APY
            90 days
        );
        console.log("Asset 1 created: MMC Trade Invoice #44");

        vm.stopBroadcast();
    }
}
