import assert from "node:assert/strict";
import test from "node:test";

import { listInvoices } from "@/server/accounting/list-invoices";

test("listInvoices returns rows and counters", async () => {
  const fakeRows = [
    { id: "inv_1", status: "UNPAID", grossCents: 10000, paidCents: 0, dueAt: new Date(), createdAt: new Date() },
  ];

  const mockDb = {
    invoice: {
      findMany: async () => fakeRows,
      count: async () => 1,
    },
    $transaction: async (ops: Array<Promise<unknown>>) => Promise.all(ops),
  } as any;

  const result = await listInvoices({ page: 1, pageSize: 20 }, mockDb);

  assert.equal(result.invoices.length, 1);
  assert.equal(result.totalCount, 1);
  assert.equal(result.unpaidCount, 1);
  assert.equal(result.partialCount, 1);
  assert.equal(result.paidCount, 1);
  assert.equal(result.overdueCount, 1);
});

test("listInvoices propagates query failures", async () => {
  const mockDb = {
    invoice: {
      findMany: async () => {
        throw new Error("db down");
      },
      count: async () => 0,
    },
    $transaction: async (ops: Array<Promise<unknown>>) => Promise.all(ops),
  } as any;

  await assert.rejects(() => listInvoices({ status: "overdue" }, mockDb), /db down/);
});

