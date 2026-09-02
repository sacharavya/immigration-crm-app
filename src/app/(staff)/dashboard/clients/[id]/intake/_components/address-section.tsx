"use client";


import type { Database } from "@/lib/supabase/types";

import { addAddress, removeAddress, updateAddress } from "../actions";
import { SelectField, TextField } from "./fields";
import { AddRowButton, DeleteRowButton } from "./saving-indicator";

type AddressRow = Database["crm"]["Tables"]["client_address_history"]["Row"];
type CountryOption = { code: string; name: string };

export function AddressSection({
  clientId,
  addresses,
  countries,
  canEdit,
}: {
  clientId: string;
  addresses: AddressRow[];
  countries: CountryOption[];
  canEdit: boolean;
}) {
  const countryOptions = countries.map((c) => ({
    value: c.code,
    label: c.name,
  }));

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        Cover the past 10 years or since age 18 with no gaps. Include the
        current address (leave the end date blank).
      </p>
      {addresses.length === 0 ? (
        <p className="text-sm text-stone-500">No addresses yet.</p>
      ) : (
        <div className="space-y-3">
          {addresses.map((row) => (
            <AddressRowEditor
              key={row.id}
              row={row}
              countries={countryOptions}
              canEdit={canEdit}
              clientId={clientId}
            />
          ))}
        </div>
      )}
      {canEdit && (
        <AddRowButton
          label="Add address"
          onAdd={() => addAddress({ clientId, address_line: "New address" })}
        />
      )}
    </div>
  );
}

function AddressRowEditor({
  row,
  countries,
  canEdit,
  clientId,
}: {
  row: AddressRow;
  countries: { value: string; label: string }[];
  canEdit: boolean;
  clientId: string;
}) {
  function save<K extends keyof AddressRow>(key: K) {
    return async (value: AddressRow[K] | null) =>
      updateAddress({
        clientId,
        id: row.id,
        patch: { [key]: value } as never,
      });
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TextField
          label="Date from"
          type="date"
          initial={row.date_from}
          save={save("date_from")}
          disabled={!canEdit}
        />
        <TextField
          label="Date to"
          type="date"
          initial={row.date_to}
          save={save("date_to")}
          disabled={!canEdit}
          helper="Leave blank for current address"
        />
        <TextField
          label="Address"
          initial={row.address_line}
          save={(v) => save("address_line")(v ?? "")}
          disabled={!canEdit}
        />
        <TextField
          label="City"
          initial={row.city}
          save={save("city")}
          disabled={!canEdit}
        />
        <TextField
          label="Province / State"
          initial={row.province_state}
          save={save("province_state")}
          disabled={!canEdit}
        />
        <SelectField
          label="Country"
          initial={row.country_code}
          options={countries}
          save={save("country_code")}
          disabled={!canEdit}
        />
      </div>
      {canEdit && (
        <div className="mt-3 flex justify-end border-t border-stone-100 pt-3">
          <DeleteRowButton onConfirm={() => removeAddress(clientId, row.id)} />
        </div>
      )}
    </div>
  );
}
