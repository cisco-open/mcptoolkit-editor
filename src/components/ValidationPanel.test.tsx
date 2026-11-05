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

  it('defaults to Passed, allows multiple statuses, and disables statuses with no results', () => {
    render(<ValidationPanel />);
    expandRules();
    expect(screen.getByRole('checkbox', { name: 'Passed', exact: true })).toHaveProperty('checked', true);
    for (const label of ['Failed', 'Warning', 'Not applicable', 'Not evaluated', 'Delegated']) {
      expect(screen.getByRole('checkbox', { name: label, exact: true })).toHaveProperty('checked', false);
    }
    expect(screen.getByRole('checkbox', { name: 'Delegated' })).toHaveProperty('disabled', true);
    expect(rulesInOrder()).toEqual(['mcp.annotations.last-modified.protocol-version', 'mcp.tool-annotations.members']);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Failed', exact: true }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Not evaluated', exact: true }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Passed', exact: true }));
    expect(rulesInOrder()).toEqual(['mcp.resource.uri', 'mcpdesc.document.schema']);
    expect(screen.getByText('earlier-stage-failed')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Not applicable', exact: true }));
    expect(rulesInOrder()).toContain('mcp.root.uri.file-scheme');
    expect(screen.getByRole('checkbox', { name: 'Passed', exact: true })).toHaveProperty('checked', false);
  });

  it('shows a clear empty filter state without treating unevaluated rules as passed', () => {
    render(<ValidationPanel />);
    expandRules();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Passed', exact: true }));
    expect(screen.getByText('No rule results match the selected statuses.')).toBeTruthy();
    expect(rulesInOrder()).toEqual([]);
  });

  it('sorts each column in both directions without changing validator results', () => {
    const original = JSON.stringify(context.state.validation.results);
    render(<ValidationPanel />);
    expandRules();
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Rule Identifier' }));
    expect(rulesInOrder()).toEqual(['mcp.tool-annotations.members', 'mcp.annotations.last-modified.protocol-version']);
    expect(screen.getByRole('columnheader', { name: 'Rule Identifier' }).getAttribute('aria-sort')).toBe('descending');
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Protocol' }));
    expect(rulesInOrder()[0]).toBe('mcp.tool-annotations.members');
    fireEvent.click(screen.getByRole('button', { name: 'Sort by Protocol' }));
    expect(rulesInOrder()[0]).toBe('mcp.annotations.last-modified.protocol-version');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Failed', exact: true }));
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

  it('shows errors separately and hides warnings until all errors are resolved', () => {
    context.state.validation.errors = [{ path: '/resources/0/uri', message: 'A resource URI needs a scheme', rule: 'mcp.resource.uri' }];
    context.state.validation.warnings = [{ path: '/tools/0', message: 'Native projection mismatch' }];
    const view = render(<ValidationPanel />);
    expect(screen.getByRole('region', { name: 'Validation errors' })).toBeTruthy();
    expect(screen.getByText('A resource URI needs a scheme')).toBeTruthy();
    expect(screen.queryByText('Native projection mismatch')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '/resources/0/uri' }));
    expect(context.revealPathRef.current).toHaveBeenCalledWith('/resources/0/uri');
    context.state.validation = { ...context.state.validation, errors: [] };
    view.rerender(<ValidationPanel />);
    expect(screen.queryByRole('region', { name: 'Validation errors' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Validation warnings' })).toBeTruthy();
    expect(screen.getByText('Native projection mismatch')).toBeTruthy();
  });

  it('handles parse errors without rule results and empty documents without stale diagnostics', () => {
    context.state.validation = { valid: false, errors: [{ path: '/', message: 'Invalid YAML' }], warnings: [] };
    const view = render(<ValidationPanel />);
    expect(screen.getByRole('button', { name: 'Expand validation rules' })).toHaveProperty('disabled', true);
    expect(screen.getByText('Invalid YAML')).toBeTruthy();
    context.state.text = ' ';
    view.rerender(<ValidationPanel />);
    expect(screen.getByTestId('validation-status').textContent).toContain('No contents');
    expect(screen.queryByText('Invalid YAML')).toBeNull();
  });
});