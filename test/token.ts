import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "@ethersproject/units";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

let Token: ContractFactory;
let token: Contract;

let deployer: SignerWithAddress;
let addr1: SignerWithAddress;
let addr2: SignerWithAddress;
let admin: SignerWithAddress;
let vesting1: SignerWithAddress;
let vesting2: SignerWithAddress;
let dao: SignerWithAddress;

describe("Token contract", function (){
    
    beforeEach(async function () {
        [deployer, addr1, addr2, admin, vesting1, vesting2, dao] = await ethers.getSigners();

        Token = await ethers.getContractFactory("AlluoToken");
        token = await Token.deploy(deployer.address);
        
    });

    describe("Tokenomics and Info", function () {
        it("Should return basic information", async function () {
            expect(await token.name()).to.equal("Alluo Token"),
            expect(await token.symbol()).to.equal("ALLUO"),
            expect(await token.decimals()).to.equal(18);
        });
        it("Should return the total max supply equal to 200000000", async function () {
            expect(await token.maxTotalSupply()).to.equal(parseEther('200000000'));
        });
    });
    describe("Balances", function () {
        it('When the requested account has no tokens it returns zero', async function () {
            expect(await token.balanceOf(addr1.address)).to.equal("0");
        });
        
        it('When the requested account has some tokens it returns the amount', async function () {
            await token.mint(deployer.address, parseEther('50'));
            expect(await token.balanceOf(deployer.address)).to.equal(parseEther('50'));
        });

    });
    describe("Transactions", function () {
        describe("Should fail when", function (){

            it('transfer to zero address', async function () {
                await expect(token.transfer(ZERO_ADDRESS, parseEther('100'))
                ).to.be.revertedWith("ERC20: transfer to the zero address");
            });
            
            it('transfer from zero address', async function () {
                await expect(token.transferFrom(ZERO_ADDRESS, addr1.address, parseEther('100'))
                ).to.be.revertedWith("ERC20: transfer from the zero address");
            });

            it('sender doesn’t have enough tokens', async function () {
                await token.connect(addr1).approve(addr2.address, parseEther('200'));
                await expect(token.transferFrom(addr1.address, addr2.address, parseEther('100'))
                ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
            });

            it('transfer amount exceeds balance', async function () {
                await expect(token.transferFrom(addr1.address, addr2.address, parseEther('100'))
                ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
            });
        });
        describe("Should transfer when everything is correct", function () {
            it('from deployer to addr1', async function () {
                await token.mint(deployer.address, parseEther('50'));

                await token.transfer(addr1.address, parseEther('50'));
                const addr1Balance = await token.balanceOf(addr1.address);
                expect(addr1Balance).to.equal(parseEther('50'));
            });

            it('from addr1 to addr2 with correct balances at the end', async function () {
                await token.mint(addr1.address, parseEther('50'));
                await token.connect(addr1).transfer(addr2.address, parseEther('25'));
                const addr1Balance = await token.balanceOf(addr1.address);
                const addr2Balance = await token.balanceOf(addr2.address);
                expect(addr1Balance).to.equal(parseEther('25')),
                expect(addr2Balance).to.equal(parseEther('25'));
            });
        });

    });

    describe('Approve', function () {
        it("Approving and TransferFrom", async function () {
            await token.mint(addr1.address, parseEther('100'));
            await token.connect(addr1).approve(addr2.address, parseEther('50'));
            expect(await token.allowance(addr1.address, addr2.address)).to.equal(parseEther('50'));

            await token.connect(addr2).transferFrom(addr1.address, addr2.address, parseEther("50") )
            expect(await token.balanceOf(addr1.address)).to.equal(parseEther('50'));
        });
        it("Not approving becouse of zero address", async function () {
            await expect(token.approve(ZERO_ADDRESS, parseEther('100'))
                ).to.be.revertedWith("ERC20: approve to the zero address");
        });
    });

    describe('Mint / Burn', function () {
        it("minting", async function () {
            await token.connect(deployer).mint(addr1.address, parseEther('1000'));
            expect(await token.totalSupply()).to.equal(parseEther('1000')),
            expect(await token.balanceOf(addr1.address)).to.equal(parseEther('1000'));
        });

        it("the mint fails because the address doesn't have the role of a minter", async function () {
            await expect(token.connect(addr1).mint(addr2.address, parseEther('200'))
                ).to.be.revertedWith("AlluoToken: must have minter role to mint");
        });

        it("adding new minter and mint", async function () {
            await token.grantRole(await token.MINTER_ROLE(), addr1.address);
            await token.connect(addr1).mint(addr2.address, parseEther('500'));
            expect(await token.totalSupply()).to.equal(parseEther('500')),
            expect(await token.balanceOf(addr2.address)).to.equal(parseEther('500'));
        });

        it("burning", async function () {
            await token.mint(addr1.address, parseEther('1000'));
            await token.connect(deployer).burn(addr1.address, parseEther('100'));
            expect(await token.maxTotalSupply()).to.equal(parseEther('200000000')),
            expect(await token.totalSupply()).to.equal(parseEther('900')),
            expect(await token.balanceOf(addr1.address)).to.equal(parseEther('900'));
        });

        it("the burn fails because the address doesn't have the role of a burner", async function () {
            await expect(token.connect(addr1).burn(deployer.address, parseEther('200'))
                ).to.be.revertedWith("AlluoToken: must have burner role to burn");
        });

        it("burn fails because the amount exceeds the balance", async function () {
            await token.mint(addr1.address, parseEther('100'));
            await expect(token.connect(deployer).burn(addr1.address, parseEther('200'))
            ).to.be.revertedWith("ERC20: burn amount exceeds balance");
        });

        it("adding new burner and burn", async function () {
            await token.grantRole(await token.BURNER_ROLE(), addr1.address);
            await token.mint(addr2.address, parseEther('1000'));
            await token.connect(addr1).burn(addr2.address, parseEther('500'));
            expect(await token.totalSupply()).to.equal(parseEther('500')),
            expect(await token.balanceOf(addr2.address)).to.equal(parseEther('500'));
        });

    });

    describe('Max Total Supply', function () {

        it("Changing it to a higher number", async function () {
            expect(await token.maxTotalSupply()).to.be.equal(parseEther('200000000'))
            await token.changeCap(parseEther('300000000'))
            expect(await token.maxTotalSupply()).to.be.equal(parseEther('300000000'))
        });

        it("Changing it to a smaller number", async function () {
            await token.changeCap(parseEther('100000000'))
            expect(await token.maxTotalSupply()).to.be.equal(parseEther('100000000'))
        });

        it("Not allow user without changer role to change cap", async function () {

            await expect(token.connect(addr1).changeCap(parseEther('300000000'))
            ).to.be.revertedWith("AlluoToken: must have cap changer role to change");

        });

    });

    // describe('Pause', function () {
    //     it("Pause token contract and not allow transfers", async function () {
    //         await token.mint(addr1.address, parseEther('100'))
    //         await token.pause();
    //         await expect(token.transfer(addr1.address, parseEther('100'))
    //         ).to.be.revertedWith("Pausable: paused");
    //     });
    //     it("Pause and unpause token contract", async function () {
    //         await token.mint(addr1.address, parseEther('100'))
    //         expect(await token.balanceOf(addr1.address)).to.equal(parseEther('100'));
    //         await token.pause();
    //         await expect(token.transfer(addr1.address, parseEther('100'))
    //         ).to.be.revertedWith("Pausable: paused");
    //         await token.unpause();
    //         await token.transfer(addr1.address, parseEther('50'));
    //         const addr1Balance = await token.balanceOf(addr1.address);
    //         expect(addr1Balance).to.equal(parseEther('50'));
    //     });

    //     it("Not allow user without pauser role to pause and unpause", async function () {
    //         await expect(token.connect(addr1).pause()
    //         ).to.be.revertedWith("AlluoToken: must have pauser role to pause");
    //         await token.connect(admin).pause();
    //         await expect(token.connect(addr1).unpause()
    //         ).to.be.revertedWith("AlluoToken: must have pauser role to unpause");
    //     });
    // });

    // describe('Granting roles example', function () {

    //     it("Full cycle", async function () {
    //         //token contract deployed and all tokens goes to deployer
    //         //deployer sends tokens to vestings and admin
    //         token.connect(deployer).transfer(vesting1.address, parseEther("50000000"))
    //         token.connect(deployer).transfer(vesting2.address, parseEther("50000000"))
    //         token.connect(deployer).transfer(admin.address, parseEther("100000000"))
    //         expect(await token.balanceOf(deployer.address)).to.equal(0);
    //         expect(await token.balanceOf(admin.address)).to.equal(parseEther("100000000"));

    //         //deployer doesnt have any roles
    //         expect(await token.hasRole(token.DEFAULT_ADMIN_ROLE(), deployer.address)).to.be.false;
    //         expect(await token.hasRole(token.ADMIN_ROLE(), deployer.address)).to.be.false;
    //         //all roles have only admin 
    //         expect(await token.hasRole(token.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
    //         expect(await token.hasRole(token.ADMIN_ROLE(), admin.address)).to.be.true;
    //         expect(await token.hasRole(token.MINTER_ROLE(), admin.address)).to.be.true;
    //         //admin can grant roles (for dao)
    //         token.connect(admin).grantRole(await token.ADMIN_ROLE(), dao.address)
    //         token.connect(admin).grantRole(await token.MINTER_ROLE(), dao.address)
    //         token.connect(admin).grantRole(await token.BURNER_ROLE(), dao.address)
    //         token.connect(admin).grantRole(await token.PAUSER_ROLE(), dao.address)
    //         //but leaves default_admin_role for himself
    //     });
    //     it("Not allow user without admin role grant other roles", async function () {
    //         await expect(token.connect(addr1).grantRole(await token.MINTER_ROLE(), addr2.address)
    //         ).to.be.revertedWith(`AccessControl: account ${addr1.address.toLowerCase()} is missing role ${await token.ADMIN_ROLE()}`);
    //     });

    // });
});
  