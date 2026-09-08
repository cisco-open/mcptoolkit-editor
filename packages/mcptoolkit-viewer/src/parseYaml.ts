// Copyright 2026 Cisco Systems, Inc. and its affiliates
//
// SPDX-License-Identifier: Apache-2.0

import yaml from 'yaml';

/** Parse YAML text using the parser bundled with the viewer. */
export function parseYaml(raw: string): unknown {
  return yaml.parse(raw);
}