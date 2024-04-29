import { CELO_DERIVATION_PATH_BASE, trimLeading0x } from "@celo/base";
import { rlpEncodedTx } from "@celo/wallet-base";
import ethPkg from "@ledgerhq/hw-app-eth";
const { default: Eth } = ethPkg;
import transportPkg from "@ledgerhq/hw-transport-node-hid";
const { default: TransportNodeHid } = transportPkg;

export const CELO_BASE_DERIVATION_PATH = `${CELO_DERIVATION_PATH_BASE.slice(
  2
)}/0`;
const CHAIN_ID = 44378;

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
      feeCurrency: "0x0000000000000000000000000000000000000001",
    },
    "cip64"
  );

  // CIP64 with data
  await signTransaction(
    ledger,
    {
      feeCurrency: "0x0000000000000000000000000000000000000001",
      data: "0xabcdef",
    },
    "cip64 with data"
  );
}

main().then(console.log).catch(console.error);
