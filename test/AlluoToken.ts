import { expect } from "chai";
import { ethers } from "hardhat";
import { AlluoToken, IERC20} from "../typechain";
import { BigNumber } from "@ethersproject/bignumber";


describe("AlluoToken", function () {
    const AlluoTokenContractName = "AlluoToken";
    
    const originalTokenBalance = BigNumber.from(0)

    let alluoToken: AlluoToken;

    beforeEach(async () => {
      const ierc20 = await ethers.getContractFactory(IERC20)

      const AlluoToken = await ethers.getContractFactory(AlluoTokenContractName);
      alluoToken = await AlluoToken.deploy();
    
    });


    it("Should check that deployer has a balance of 0 of ALLUO", async function () {
        const alluoBalance = await alluoToken.balanceOf();

        expect(alluoBalance == originalTokenBalance).to.be.true;

        console.log(`ALLUO: ${alluoBalance.toString()}`);
    })

});