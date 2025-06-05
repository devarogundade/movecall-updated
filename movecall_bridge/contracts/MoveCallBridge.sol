// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IMoveCallBridge} from "./interfaces/IMoveCallBridge.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// This is a very simplified contract.

contract MoveCallBridge is IMoveCallBridge, Ownable {
    uint256 internal _nonce;
    mapping(address => string) internal _coinTypes;

    address public constant ETH = address(0);
    uint8 public constant ETH_DECIMALS = 18;

    uint256 public constant FEES = 10_000;
    uint256 public constant DENOMINATOR = 1_000_000;

    constructor() Ownable(msg.sender) {}

    // ====== Token Pipeline ====== //

    function lockAndMint(
        address token,
        uint256 amount,
        bytes32 receiver
    ) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);

        _lockAndMint(token, amount, IERC20Metadata(token).decimals(), receiver);
    }

    function lockAndMintETH(bytes32 receiver) external payable {
        _lockAndMint(ETH, msg.value, ETH_DECIMALS, receiver);
    }

    function _lockAndMint(
        address token,
        uint256 amount,
        uint8 decimals,
        bytes32 receiver
    ) internal {
        string memory coinType = _coinTypes[token];

        bytes32 uid = keccak256(
            abi.encode(_nonce, coinType, token, amount, receiver)
        );

        uint256 fee = (amount * FEES) / DENOMINATOR;
        uint256 amountWithFees = amount - fee;

        emit TokenLocked(uid, coinType, decimals, amountWithFees, receiver);

        _nonce = _nonce + 1;
    }

    // ====== Message Pipeline ====== //

    function sendMessage(
        uint64 toChain,
        bytes32 to,
        bytes memory data
    ) external payable {
        bytes32 uid = keccak256(abi.encode(_nonce, toChain, to));

        emit MessageSent(uid, toChain, msg.sender, to, data);

        _nonce = _nonce + 1;
    }

    function getCoinType(address token) external view returns (string memory) {
        return _coinTypes[token];
    }

    // ====== Admin ====== //

    function setCoinType(
        address token,
        string memory coinType
    ) external onlyOwner {
        _coinTypes[token] = coinType;
    }
}
