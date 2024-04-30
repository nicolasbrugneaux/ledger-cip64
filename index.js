import { CELO_DERIVATION_PATH_BASE, trimLeading0x } from "@celo/base";
import { rlpEncodedTx } from "@celo/wallet-base";
import ethPkg from "@ledgerhq/hw-app-eth";
const { default: Eth } = ethPkg;
import transportPkg from "@ledgerhq/hw-transport-node-hid";
const { default: TransportNodeHid } = transportPkg;

export const CELO_BASE_DERIVATION_PATH = `${CELO_DERIVATION_PATH_BASE.slice(
  2
)}/0`;
const CHAIN_ID = 44787;

/**
 *
 * @param {Eth} ledger
 */
async function retrieveLedgerInfo(ledger) {
  const appConfiguration = await ledger.getAppConfiguration();
  const derivationPath = `${CELO_BASE_DERIVATION_PATH}/0`;
  const addressInfo = await ledger.getAddress(derivationPath);
  return { addressInfo, appConfiguration };
}

async function signTransaction(ledger, overrides = {}, name = "eip1559") {
  const { addressInfo } = await retrieveLedgerInfo(ledger);
  const baseTx = {
    from: addressInfo.address,
    to: addressInfo.address,
    chainId: CHAIN_ID,
    value: 1,
    nonce: 0,
    gas: 99,
    maxFeePerGas: 99,
    maxPriorityFeePerGas: 99,
  };
  const { rlpEncode, transaction, type } = rlpEncodedTx({
    ...baseTx,
    ...overrides,
  });
  if (type === "cip64") {
    await addcUSDasFeeCurrency(ledger);
  }
  console.log(`\n==================== BEGIN ${name} ====================`);
  console.info(`Signing...`, { transaction, rlpEncode, type });
  try {
    const signature = await ledger.signTransaction(
      CELO_BASE_DERIVATION_PATH,
      trimLeading0x(rlpEncode),
      null
    );

    console.info(`Success`);
    return signature;
  } catch (e) {
    console.error(
      `Failed to execute \`signTransaction\` for ${name}. See original error thrown below`
    );
    throw e;
  } finally {
    console.log(`==================== END ${name} ====================\n`);
  }
}
async function addcUSDasFeeCurrency(ledger) {
  console.log("Adding cUSD as fee currency");
  let data = "0463555344765de816845861e75a25fca122bb6898b8b1282a000000120000a4ec3045022100a704051cd04a5e9f95da3abc04c0f6cbfe40c02f5b84f4361f8853fef325fc1e022056a5395b4114644450a314fc5e6f0e524b790ad39fa1907837abb6907616932f"
  let response = await ledger.provideERC20TokenInformation(data)
  console.log("response", response)
  if (response !== true) {
    throw new Error("Failed to add cUSD as fee currency");
  }
  console.log("cUSD added as fee currency");
}

async function main() {
  const transport = await TransportNodeHid.open("");
  const ledger = new Eth(transport);
  const { addressInfo, appConfiguration } = await retrieveLedgerInfo(ledger);
  console.info("app appConfiguration", appConfiguration);
  console.info("user addressInfo", addressInfo);

  // EIP1559
  await signTransaction(ledger);

  // CIP64
  await signTransaction(
    ledger,
    {
      feeCurrency: "0x765de816845861e75a25fca122bb6898b8b1282a",
    },
    "cip64"
  );

  // CIP64 with data
  await signTransaction(
    ledger,
    {
      feeCurrency: "0x765de816845861e75a25fca122bb6898b8b1282a",
      data: "0xabcdef",
    },
    "cip64 with data"
  );
}

main().then(console.log).catch(console.error);
