<div id="top"></div>

<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![Discord][discord-shield]][discord-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://alluo.finance">
    <img src="https://assets.website-files.com/613b4c4a426c9b2c4d31caaa/6168135b36da4560d493f4d3_Group%20242-p-500.png" alt="Logo">
  </a>

  <h3 align="center">Alluo - Strategies</h3>

  <p align="center">
   Main logic of the Alluo liquidity direction protocol.
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#testing">Testing</a></li>
      </ul>
    </li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

This repo contains all the strategies the Alluo protocol has access to to invest the funds that are held by Alluo.

These strategies are mainly built by the Core Contributors, but we welcome anyone to help or new protocols to submit strategies for their own farms.

Strategies hold the logic on what to do the funds from the vote executor and how to interact with the target procotol, this is really the heart of the logic.

Strategies have to implement a set of standard functions that are needed by the Protocol to be executed, we are currently working on an Interface for our community.

<p align="right">(<a href="#top">back to top</a>)</p>



### Built With

Here are the major framework / languages used to build the Strategies.

* [Hardhat](https://hardhat.org/)
* [Typescript](https://www.typescriptlang.org/)
* [Solidity Coverage](https://github.com/sc-forks/solidity-coverage)
* [Etherscan](https://etherscan.io/apis/)

#### hardhat

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
npx hardhat coverage
npx hardhat run scripts/deploy.ts
TS_NODE_FILES=true npx ts-node scripts/deploy.ts
npx eslint '**/*.{js,ts}'
npx eslint '**/*.{js,ts}' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

### Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Rinkeby.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Rinkeby node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network rinkeby scripts/sample-script.ts
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network rinkeby DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```

#### Performance optimizations

For faster runs of your tests and scripts, consider skipping ts-node's type checking by setting the environment variable `TS_NODE_TRANSPILE_ONLY` to `1` in hardhat's environment. For more details see [the documentation](https://hardhat.org/guides/typescript.html#performance-optimizations).


<p align="right">(<a href="#top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

This is an example of how you may give instructions on setting up your project locally.
To get a local copy up and running follow these simple example steps.

### Prerequisites

This is an example of how to list things you need to use the software and how to install them.
* npm
  ```sh
  npm install
  cp .env.example .env
  nano .env
  ```

* yarn
  ```sh
  yarn install
  cp .env.example .env
  nano .env
  ```

### Testing

  ```sh
  npx hardhat clean
  npx hardhat test
  ```

<p align="right">(<a href="#top">back to top</a>)</p>


<!-- ROADMAP -->
## Roadmap

See our public roadmap here: [Roadmap](https://roadmap.alluo.com/)

See the [open issues](https://github.com/GetAlluo/alluo-strategies/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source and DeFi communities such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Bug bounties

If you notice any vulnerabilities, bugs, or even efficiency improvements please checkout our Bug Bounty program on [Gitcoin](www.google.com)

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

0xtuytuy.eth - [@0xtuytuy](https://twitter.com/0xtuytuy) - rt@alluo.com

Project Link: [https://github.com/GetAlluo/alluo-strategies](https://github.com/GetAlluo/alluo-strategies)

<p align="right">(<a href="#top">back to top</a>)</p>


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/GetAlluo/alluo-strategies?style=for-the-badge
[contributors-url]: https://github.com/GetAlluo/alluo-strategies/graphs/contributors

[forks-shield]: https://img.shields.io/github/forks/GetAlluo/alluo-strategies?style=for-the-badge
[forks-url]: https://github.com/GetAlluo/alluo-strategies/network/members

[stars-shield]: https://img.shields.io/github/stars/GetAlluo/alluo-strategies?style=for-the-badge
[stars-url]: https://github.com/GetAlluo/alluo-strategies/stargazers

[issues-shield]: https://img.shields.io/github/issues/GetAlluo/alluo-strategies?style=for-the-badge
[issues-url]: https://github.com/GetAlluo/alluo-strategies/issues

[discord-shield]: https://img.shields.io/badge/Discord-Join%20us-blue?style=for-the-badge
[discord-url]: https://discord.gg/tuN3y3Tfe4