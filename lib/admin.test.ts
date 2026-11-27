import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { isAdminEmail } from './admin';

const original = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (original === undefined) {
    Reflect.deleteProperty(process.env, 'ADMIN_EMAILS');
  } else {
    process.env.ADMIN_EMAILS = original;
  }
});

describe('admin allowlist', () => {
  it('matches emails case-insensitively', () => {
    process.env.ADMIN_EMAILS = ' Owner@Example.com , second@example.com ';
    assert.equal(isAdminEmail('owner@example.com'), true);
    assert.equal(isAdminEmail('second@example.com'), true);
  });

  it('rejects emails that are not listed', () => {
    process.env.ADMIN_EMAILS = 'owner@example.com';
    assert.equal(isAdminEmail('someone@example.com'), false);
    assert.equal(isAdminEmail(null), false);
  });

  it('treats an empty allowlist as no admins', () => {
    process.env.ADMIN_EMAILS = '';
    assert.equal(isAdminEmail('owner@example.com'), false);
  });
});
