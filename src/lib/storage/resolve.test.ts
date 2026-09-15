/**
 * Tests for the storage-config resolver: how the crm.storage_settings row
 * merges over the legacy GRAPH_* env vars, and when the OneDrive adapter
 * refuses to run.
 *
 * Run via: npm test (node:test through tsx).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  oneDriveConfigError,
  resolveStorageSettings,
  type StorageSettingsRow,
} from "./resolve";

const ENV = { driveId: "b!envLibrary", rootFolder: "Test-CRM" };

const row = (patch: Partial<StorageSettingsRow> = {}): StorageSettingsRow => ({
  provider: "onedrive",
  drive_id: null,
  root_folder: "",
  ...patch,
});

describe("resolveStorageSettings", () => {
  it("falls back to env when the row leaves the drive id blank", () => {
    const s = resolveStorageSettings(row(), ENV);
    assert.equal(s.driveId, "b!envLibrary");
    assert.equal(s.provider, "onedrive");
  });

  it("prefers the stored drive id over the env var", () => {
    const s = resolveStorageSettings(row({ drive_id: "b!savedLibrary" }), ENV);
    assert.equal(s.driveId, "b!savedLibrary");
  });

  it("treats a whitespace-only stored drive id as unset", () => {
    const s = resolveStorageSettings(row({ drive_id: "   " }), ENV);
    assert.equal(s.driveId, "b!envLibrary");
  });

  it("lets a saved blank root folder override the env var", () => {
    // The row exists, so "" is a deliberate choice to anchor at the drive
    // root — not a gap for GRAPH_ROOT_FOLDER to fill.
    const s = resolveStorageSettings(row({ root_folder: "" }), ENV);
    assert.equal(s.rootFolder, "");
  });

  it("uses env config entirely when the row is missing", () => {
    const s = resolveStorageSettings(null, ENV);
    assert.deepEqual(s, {
      provider: "onedrive",
      driveId: "b!envLibrary",
      rootFolder: "Test-CRM",
    });
  });

  it("reports no drive when neither the row nor env configures one", () => {
    const s = resolveStorageSettings(row(), {});
    assert.equal(s.driveId, null);
    assert.equal(s.rootFolder, "");
  });

  it("keeps a non-onedrive provider from the row", () => {
    const s = resolveStorageSettings(row({ provider: "google_drive" }), ENV);
    assert.equal(s.provider, "google_drive");
  });

  it("defaults an unrecognised provider value to onedrive", () => {
    const s = resolveStorageSettings(row({ provider: "dropbox" }), ENV);
    assert.equal(s.provider, "onedrive");
  });
});

describe("oneDriveConfigError", () => {
  it("passes a configured onedrive setup", () => {
    const s = resolveStorageSettings(row({ drive_id: "b!x" }), ENV);
    assert.equal(oneDriveConfigError(s), null);
  });

  it("refuses a provider with no adapter, naming it", () => {
    const s = resolveStorageSettings(row({ provider: "google_drive" }), ENV);
    const err = oneDriveConfigError(s);
    assert.match(err ?? "", /Google Drive/);
    assert.match(err ?? "", /no adapter/);
  });

  it("refuses when no document library is configured anywhere", () => {
    const s = resolveStorageSettings(row(), {});
    assert.match(oneDriveConfigError(s) ?? "", /No document library/);
  });
});
