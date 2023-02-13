
import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.4.0/index.ts';
import { assert, assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';
import fc from 'https://cdn.skypack.dev/fast-check@3.6.2';

Clarinet.test({
    name: "Ensure that <...>",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        let block = chain.mineBlock([
            /* 
             * Add transactions with: 
             * Tx.contractCall(...)
            */
        ]);
        assertEquals(block.receipts.length, 0);
        assertEquals(block.height, 2);

        block = chain.mineBlock([
            /* 
             * Add transactions with: 
             * Tx.contractCall(...)
            */
        ]);
        assertEquals(block.receipts.length, 0);
        assertEquals(block.height, 3);
    },
});

Clarinet.test({
  name: 'get-message returns none when write-sup is not called',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // Arrange
    // Act
    let results = [...accounts.values()].map(account => {
      const who = types.principal(account.address);
      const msg = chain.callReadOnlyFn(
        'sup', 'get-message', [who], account.address);
      return msg.result;
    });

    // Assert
    assert(results.length > 0);
    results.forEach(msg => msg.expectNone());
  }
});

Clarinet.test({
  name: 'write-sup returns expected string',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // Property-based test, runs 100 times by default.
    fc.assert(fc.property(
      // Generate pseudo-random 'lorem ipsum' string and a number.
      fc.lorem(), fc.integer({min: 1, max: 100}), (lorem: string, integer: number) => {
        // Arrange
        const deployer = accounts.get('deployer')!;
        const msg = types.utf8(lorem);
        const stx = types.uint(integer);

        // Act
        const block = chain.mineBlock([
          Tx.contractCall(
            'sup', 'write-sup', [msg, stx], deployer.address)
        ]);
        const result = block.receipts[0].result;

        // Assert
        result
          .expectOk()
          .expectAscii('Sup written successfully');
      })
    );
  }
});

Clarinet.test({
  name: 'write-sup increases total count by 1',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // Property-based test, runs 100 times by default.
    fc.assert(fc.property(
      // Generate pseudo-random 'lorem ipsum' string and a number.
      fc.lorem(), fc.integer({min: 1, max: 100}), (lorem: string, integer: number) => {
        // Arrange
        const deployer = accounts.get('deployer')!;
        let startCount = chain.callReadOnlyFn(
          'sup', 'get-sups', [], deployer.address).result;

        const msg = types.utf8(lorem);
        const stx = types.uint(integer);

        // Act
        chain.mineBlock([
          Tx.contractCall(
            'sup', 'write-sup', [msg, stx], deployer.address)
        ]);

        // Assert
        const endCount = chain.callReadOnlyFn(
          'sup', 'get-sups', [], deployer.address).result;

        startCount = startCount.replace('u', ''); // u123 -> 123
        endCount.expectUint(Number(startCount) + 1);
      })
    );
  }
});

Clarinet.test({
  name: 'sups are not specific to the tx-sender',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // Property-based test, runs 100 times by default.
    fc.assert(fc.property(
      // Generate pseudo-random 'lorem ipsum' string and a number.
      fc.lorem(), fc.integer({min: 1, max: 100}), (lorem: string, integer: number) => {
        // Arrange
        const deployer = accounts.get('deployer')!;
        let startCount = chain.callReadOnlyFn(
          'sup', 'get-sups', [], deployer.address).result;

        const msg = types.utf8(lorem);
        const stx = types.uint(integer);

        const addresses = [...accounts.values()]
          .slice(0, -1)
          .map(x => x.address);

        // Act
        const txs = addresses.map((_, i) =>
          Tx.contractCall(
            'sup', 'write-sup', [msg,stx], addresses[i]));
        chain.mineBlock(txs);

        let results = [...accounts.values()].map(account =>
          chain.callReadOnlyFn(
            'sup', 'get-sups', [], account.address).result
        );

        // Assert
        assert(results.length > 0);

        startCount = startCount.replace('u', ''); // u123 -> 123
        const expectedCount = Number(startCount) + txs.length;

        results.forEach(actualCount =>
          actualCount.expectUint(expectedCount));
      })
    );
  }
});

