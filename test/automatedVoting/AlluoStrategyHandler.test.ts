import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { AlluoStrategyHandler, AlluoVoteExecutorUtils, PseudoMultisigWallet } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { mine, reset } from "@nomicfoundation/hardhat-network-helpers";

describe("AlluoStrategyHandler Tests", function () {
    let alluoStrategyHandler: AlluoStrategyHandler;
    let alluoVoteExecutorUtils: AlluoVoteExecutorUtils;
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let spokePool: string;
    let _recipient: string;
    let _recipientChainId: string;
    let _relayerFeePct: number;
    let _slippageTolerance: number;
    let _exchange: string;
    let _voteExecutorUtils: string;
    beforeEach(async () => {
        // Test on optimism
        signers = await ethers.getSigners();
        admin = await ethers.getImpersonatedSigner("0xc7061dD515B602F86733Fa0a0dBb6d6E6B34aED4")
        let strategyHandlerFactory = await ethers.getContractFactory("AlluoStrategyHandler");
        spokePool = ethers.constants.AddressZero;
        _recipient = ethers.constants.AddressZero
        _recipientChainId = "0";
        _relayerFeePct = 0;
        _slippageTolerance = 150;
        _exchange = "0x66Ac11c106C3670988DEFDd24BC75dE786b91095"

        let utilsFactory = await ethers.getContractFactory("VoteExecutorUtils");
        alluoVoteExecutorUtils = (await upgrades.deployProxy(utilsFactory, [
            ethers.constants.AddressZero,
            ethers.constants.AddressZero,
            admin.address
        ], {
            initializer: "initialize"
        })) as AlluoVoteExecutorUtils;

        alluoStrategyHandler = (await upgrades.deployProxy(strategyHandlerFactory, [admin.address, spokePool, _recipient, _recipientChainId, _relayerFeePct, _slippageTolerance, _exchange, alluoVoteExecutorUtils.address])) as AlluoStrategyHandler;

        await alluoVoteExecutorUtils.connect(admin).setStorageAddresses(alluoStrategyHandler.address, ethers.constants.AddressZero)
        await reset(process.env.OPTIMISM_URL, 94688806);
    });

})