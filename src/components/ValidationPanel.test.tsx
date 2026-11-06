import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ValidationResult } from '../core/types';
import ValidationPanel from './ValidationPanel';

const context = vi.hoisted(() => ({
  state: { text: 'mcpdesc: 0.9.0', format: 'yaml', validation: { valid: true, errors: [], warnings: [] } as ValidationResult },
  revealPathRef: { current: vi.fn() },
}));

vi.mock('../hooks/useDoc', () => ({ useDoc: () => context }));

function expandRules() {
  fireEvent.click(screen.getByRole('button', { name: 'Expand validation rules' }));
}

function rulesInOrder() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);
}

describe('ValidationPanel', () => {
  beforeEach(() => {
    context.state.text = 'mcpdesc: 0.9.0';
    context.state.validation = {
      valid: true, errors: [], warnings: [], selector: '0.9.0-rc.1',
      results: [
        { rule: 'mcp.tool-annotations.members', protocolVersion: '2024-11-05', status: 'passed' },
        { rule: 'mcp.annotations.last-modified.protocol-version', protocolVersion: '2025-11-25', status: 'passed' },
        { rule: 'mcp.resource.uri', protocolVersion: '2025-03-26', status: 'failed' },
        { rule: 'mcp.tool.schema.native-shape', protocolVersion: '2025-11-25', status: 'warning' },
        { rule: 'mcp.root.uri.file-scheme', protocolVersion: '2025-03-26', status: 'not-applicable' },
        { rule: 'mcpdesc.document.schema', status: 'not-evaluated', reason: 'earlier-stage-failed' },
      ],
    };
  });

  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it('uses one compact disclosure beside the status and labels the selector', () => {
    render(<ValidationPanel />);
    expect(screen.getByTestId('validation-status').textContent).toBe('✓ Valid');
    expect(screen.getByText('Selector: 0.9.0-rc.1')).toBeTruthy();
    expect(screen.queryByText('Validation details')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expandRules();
    expect(screen.getByRole('button', { name: 'Collapse validation rules' }).getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse validation rules' }));
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('defaults to passed and findings, allows multiple statuses, and omits operation checks', () => {
    context.state.validation.results = [
      ...context.state.validation.results ?? [],
      { rule: 'mcpdesc.serialization.conforming', status: 'delegated' },
      { rule: 'mcp.tool.schema-keywords.preserve', status: 'not-evaluated', reason: 'operation' },
    ];
    render(<ValidationPanel />);
    expandRules();
    for (const label of ['Passed', 'Failed', 'Warning']) {
      expect(screen.getByRole('checkbox', { name: label })).toHaveProperty('checked', true);
    }
    for (const label of ['Not applicable', 'Not evaluated']) {
      expect(screen.getByRole('checkbox', { name: label })).toHaveProperty('checked', false);
    }
    expect(screen.queryByRole('checkbox', { name: 'Delegated' })).toBeNull();
    expect(screen.queryByText('mcpdesc.serialization.conforming')).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Not evaluated' }).parentElement?.textContent).toContain('(1)');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Not evaluated' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Passed' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Warning' }));
    expect(rulesInOrder()).toEqual(['mcp.resource.uri', 'mcpdesc.document.schema']);
    expect(screen.getByText('(earlier-stage-failed)')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Not applicable' }));
    expect(rulesInOrder()).toContain('mcp.root.uri.file-scheme');
    expect(screen.getByRole('checkbox', { name: 'Passed' })).toHaveProperty('checked', false);
  });

  it('shows a clear empty filter state without treating unevaluated rules as passed', () => {
    render(<ValidationPanel />);
    expandRules();
    for (const name of ['Passed', 'Failed', 'Warning']) fireEvent.click(screen.getByRole('checkbox', { name }));
    expect(screen.getByText('No validation results match the selected filters.')).toBeTruthy();
    expect(rulesInOrder()).toEqual([]);
  });

  it('sorts each column in both directions without changing validator results', () => {
    const original = JSON.stringify(context.state.validation.results);
    render(<ValidationPanel />);
    expandRules();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Failed' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Warning' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Rule Identifier' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Rule Identifier' }));
    expect(rulesInOrder()).toEqual(['mcp.tool-annotations.members', 'mcp.annotations.last-modified.protocol-version']);
    expect(screen.getByRole('columnheader', { name: 'Rule Identifier' }).getAttribute('aria-sort')).toBe('descending');
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Protocol' }));
    expect(rulesInOrder()[0]).toBe('mcp.tool-annotations.members');
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Protocol' }));
    expect(rulesInOrder()[0]).toBe('mcp.annotations.last-modified.protocol-version');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Failed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Status' }));
    expect(rulesInOrder()[0]).toBe('mcp.resource.uri');
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Status' }));
    expect(rulesInOrder().at(-1)).toBe('mcp.resource.uri');
    expect(JSON.stringify(context.state.validation.results)).toBe(original);
  });

  it('links RC.1 rules to versioned documentation without inventing catalogs for 0.8', () => {
    const view = render(<ValidationPanel />);
    expandRules();
    const link = screen.getByRole('link', { name: 'Open documentation for mcp.annotations.last-modified.protocol-version' });
    expect(link.getAttribute('href')).toBe('https://mcpdesc.org/docs/rules/0.9.0-rc.1/mcp/annotations-last-modified-protocol-version/');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    context.state.validation = { ...context.state.validation, selector: '0.8.0-rev.20261021' };
    view.rerender(<ValidationPanel />);
    expect(screen.queryByRole('link', { name: /^Open documentation/ })).toBeNull();
  });

  it('shows errors, warnings, and passed rules together with expandable diagnostic details', () => {
    context.state.validation.errors = [{ path: '/resources/0/uri', message: 'A resource URI needs a scheme', rule: 'mcp.resource.uri' }];
    context.state.validation.warnings = [
      { path: '/tools/0', message: 'Native projection mismatch', rule: 'mcp.tool.schema.native-shape' },
      { path: '/resources/0', message: 'Review resource', rule: 'mcp.resource.uri' },
    ];
    render(<ValidationPanel />);
    expect(screen.getByRole('region', { name: 'Validation rules' })).toBeTruthy();
    expect(screen.getByTestId('validation-status').textContent).toContain('1 error, 2 warnings');
    expect(screen.getByText('mcp.tool-annotations.members')).toBeTruthy();
    expect(screen.queryByText('A resource URI needs a scheme')).toBeNull();
    expect(screen.queryByText('Native projection mismatch')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expand findings for mcp.resource.uri (2025-03-26)' }));
    expect(screen.getByText('A resource URI needs a scheme')).toBeTruthy();
    expect(screen.getByText('Review resource')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '/resources/0/uri' }));
    expect(context.revealPathRef.current).toHaveBeenCalledWith('/resources/0/uri');
    fireEvent.click(screen.getByRole('button', { name: 'Expand findings for mcp.tool.schema.native-shape (2025-11-25)' }));
    expect(screen.getByText('Native projection mismatch')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse findings for mcp.resource.uri (2025-03-26)' }));
    expect(screen.queryByText('A resource URI needs a scheme')).toBeNull();
  });

  it('keeps the same filters and disclosure when validation findings change', () => {
    const view = render(<ValidationPanel />);
    expandRules();
    expect(screen.getByRole('table')).toBeTruthy();
    context.state.validation = { ...context.state.validation, errors: [{ path: '/info', message: 'Invalid info' }] };
    view.rerender(<ValidationPanel />);
    expect(screen.getByText('Invalid info')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Passed' })).toHaveProperty('checked', true);
    context.state.validation = { ...context.state.validation, errors: [], warnings: [{ path: '/info', message: 'Review info' }] };
    view.rerender(<ValidationPanel />);
    expect(screen.getByText('Review info')).toBeTruthy();
    expect(screen.queryByText('Invalid info')).toBeNull();
    context.state.validation = { ...context.state.validation, warnings: [] };
    view.rerender(<ValidationPanel />);
    expect(screen.getByRole('region', { name: 'Validation rules' })).toBeTruthy();
  });

  it('uses a five-row viewport independent of result count and supports pointer and keyboard resizing', () => {
    render(<ValidationPanel />);
    expandRules();
    const viewport = screen.getByTestId('validation-table-viewport');
    const separator = screen.getByRole('separator', { name: 'Resize validation panel' });
    expect(viewport.style.height).toBe('144px');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Passed' }));
    expect(viewport.style.height).toBe('144px');
    fireEvent.keyDown(separator, { key: 'ArrowUp' });
    expect(viewport.style.height).toBe('168px');
    fireEvent.keyDown(separator, { key: 'ArrowDown' });
    expect(viewport.style.height).toBe('144px');
    fireEvent(separator, new MouseEvent('pointerdown', { bubbles: true, clientY: 400 }));
    fireEvent(separator, new MouseEvent('pointermove', { bubbles: true, clientY: 352 }));
    fireEvent(separator, new MouseEvent('pointerup', { bubbles: true }));
    expect(viewport.style.height).toBe('192px');
    expect(separator.getAttribute('aria-valuenow')).toBe('192');
    fireEvent.doubleClick(separator);
    expect(viewport.style.height).toBe('144px');
    fireEvent.keyDown(separator, { key: 'Home' });
    expect(viewport.style.height).toBe('48px');
    fireEvent.keyDown(separator, { key: 'End' });
    expect(Number.parseFloat(viewport.style.height)).toBeGreaterThan(144);
  });

  it('scales and resets text while retaining a five-row default and bounded controls', () => {
    render(<ValidationPanel />);
    expandRules();
    const viewport = screen.getByTestId('validation-table-viewport');
    const increase = screen.getByRole('button', { name: 'Increase validation font size' });
    const decrease = screen.getByRole('button', { name: 'Decrease validation font size' });
    fireEvent.click(increase);
    expect(screen.getByRole('button', { name: 'Reset validation font size' }).textContent).toBe('13px');
    expect(viewport.style.height).toBe('150px');
    for (let count = 0; count < 20; count += 1) fireEvent.click(increase);
    expect(increase).toHaveProperty('disabled', true);
    for (let count = 0; count < 20; count += 1) fireEvent.click(decrease);
    expect(decrease).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset validation font size' }));
    expect(viewport.style.height).toBe('144px');
  });

  it('shows authoritative short titles after identifiers and sorts them', () => {
    render(<ValidationPanel />);
    expandRules();
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(['Rule Identifier', 'Rule Title', 'Protocol', 'Status']);
    expect(screen.getByText('Use lastModified only where MCP defines it')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Rule Title' }));
    expect(screen.getByRole('columnheader', { name: 'Rule Title' }).getAttribute('aria-sort')).toBe('ascending');
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Rule Title' }));
    expect(screen.getByRole('columnheader', { name: 'Rule Title' }).getAttribute('aria-sort')).toBe('descending');
  });

  it('searches rules and diagnostic details and filters both by protocol', () => {
    context.state.validation.errors = [
      { path: '/resources/0/uri', message: 'A resource URI needs a scheme', rule: 'mcp.resource.uri', protocolVersions: ['2025-11-25'] },
      { path: '/tools/0', message: 'Tool declaration mismatch', rule: 'mcpdesc.tool.members', protocolVersions: ['2025-03-26'] },
      { path: '/', message: 'Invalid source', keyword: 'parse', line: 2, column: 3 },
    ];
    render(<ValidationPanel />);
    const table = screen.getByRole('table', { name: 'Validation rule results' });
    expect(screen.getByRole('checkbox', { name: 'Passed' })).toBeTruthy();
    expect(screen.getByTitle('Invalid source (parse)')).toBeTruthy();
    expect(screen.getByRole('button', { name: '/ (line 2, column 3)' })).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search validation' }), { target: { value: 'SCHEME' } });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter validation protocol' }), { target: { value: '2025-03-26' } });
    expect(screen.getByText('No validation results match the selected filters.')).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search validation' }), { target: { value: '' } });
    expect(screen.getByText('Tool declaration mismatch')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter validation protocol' }), { target: { value: 'unscoped' } });
    expect(screen.getByText('Invalid source')).toBeTruthy();
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse validation rules' }));
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('separator')).toBeNull();
  });

  it('handles parse errors without rule results and empty documents without stale diagnostics', () => {
    context.state.validation = { valid: false, errors: [{ path: '/', message: 'Invalid YAML' }], warnings: [] };
    const view = render(<ValidationPanel />);
    expect(screen.getByRole('button', { name: 'Collapse validation rules' })).toHaveProperty('disabled', false);
    expect(screen.getByText('Invalid YAML')).toBeTruthy();
    context.state.text = ' ';
    view.rerender(<ValidationPanel />);
    expect(screen.getByTestId('validation-status').textContent).toContain('No contents');
    expect(screen.queryByText('Invalid YAML')).toBeNull();
  });
});