/// <reference types="node" />
import { describe, expect, it } from '@jest/globals';
import { DatabaseSync } from 'node:sqlite';

describe('node:sqlite availability for repository tests', () => {
  it('opens an in-memory database', () => {
    const db = new DatabaseSync(':memory:');
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
    db.prepare('INSERT INTO t (name) VALUES (?)').run('hello');
    const row = db.prepare('SELECT name FROM t').get() as { name: string };
    expect(row.name).toBe('hello');
    db.close();
  });
});
