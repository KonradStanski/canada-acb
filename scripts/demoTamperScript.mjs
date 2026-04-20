#!/usr/bin/env node
import { generateWsTamperScript } from '../dist/index.js';

const use2024 = process.argv.includes('--2024');
const year = use2024 ? 2024 : 2025;

const entries2025 = [
  {
    typeKey: 'p',
    description: 'ACME 2025-03-15',
    settlementDate: '2025-03-15',
    proceeds: 12500.75,
    costBase: 9800.40,
    expenses: 12.50,
  },
  {
    typeKey: 'p',
    description: 'ACME 2025-08-22',
    settlementDate: '2025-08-22',
    proceeds: 4200.00,
    costBase: 4500.10,
    expenses: 6.25,
  },
];

// 2024 straddles the Jun 24 CRA period split — include one disposition in each.
const entries2024 = [
  {
    typeKey: 'p',
    description: 'ACME 2024-03-15',
    settlementDate: '2024-03-15',
    proceeds: 12500.75,
    costBase: 9800.40,
    expenses: 12.50,
  },
  {
    typeKey: 'p',
    description: 'ACME 2024-08-22',
    settlementDate: '2024-08-22',
    proceeds: 4200.00,
    costBase: 4500.10,
    expenses: 6.25,
  },
];

const entries = use2024 ? entries2024 : entries2025;

const script = generateWsTamperScript(entries, year, {
  namespace: 'canada-acb-demo',
  label: 'DEMO',
  symbolName: 'ACME',
});

process.stdout.write(script);
