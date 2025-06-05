// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMoveCallBridge {
    event TokenLocked(
        bytes32 indexed uid,
        string coinType,
        uint256 decimals,
        uint256 amount,
        bytes32 receiver
    );

    event MessageSent(
        bytes32 indexed uid,
        uint64 toChain,
        address from,
        bytes32 to,
        bytes data
    );

    function lockAndMint(
        address token,
        uint256 amount,
        bytes32 receiver
    ) external;

    function sendMessage(
        uint64 toChain,
        bytes32 to,
        bytes memory data
    ) external payable;

    function lockAndMintETH(bytes32 receiver) external payable;

    function getCoinType(address token) external view returns (string memory);
}
