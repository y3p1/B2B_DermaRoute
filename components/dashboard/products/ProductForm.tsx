import React, { useState } from "react";
import type { Product } from "./ProductList";

type ProductFormProps = {
  initial?: Product;
  onSave: (data: Product) => void;
  onCancel: () => void;
};

export default function ProductForm({
  initial,
  onSave,
  onCancel,
}: ProductFormProps) {
  const [form, setForm] = useState<Product>(
    initial || {
      id: 0,
      name: "",
      manufacturerId: 0,
      description: "",
      quarter: 1,
      year: new Date().getFullYear(),
    },
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="space-y-4"
    >
      <div>
        <label className="block mb-1">Name</label>
        <input
          className="border px-2 py-1 w-full"
          value={form.name}
          onChange={(e) =>
            setForm((f: Product) => ({ ...f, name: e.target.value }))
          }
          required
        />
      </div>
      <div>
        <label className="block mb-1">Manufacturer ID</label>
        <input
          className="border px-2 py-1 w-full"
          value={form.manufacturerId}
          onChange={(e) =>
            setForm((f: Product) => ({
              ...f,
              manufacturerId: Number(e.target.value),
            }))
          }
          required
        />
      </div>
      <div>
        <label className="block mb-1">Description</label>
        <textarea
          className="border px-2 py-1 w-full"
          value={form.description}
          onChange={(e) =>
            setForm((f: Product) => ({ ...f, description: e.target.value }))
          }
        />
      </div>
      <div>
        <label className="block mb-1">Quarter</label>
        <input
          type="number"
          min={1}
          max={4}
          className="border px-2 py-1 w-full"
          value={form.quarter}
          onChange={(e) =>
            setForm((f: Product) => ({ ...f, quarter: Number(e.target.value) }))
          }
          required
        />
      </div>
      <div>
        <label className="block mb-1">Year</label>
        <input
          type="number"
          className="border px-2 py-1 w-full"
          value={form.year}
          onChange={(e) =>
            setForm((f: Product) => ({ ...f, year: Number(e.target.value) }))
          }
          required
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-1 rounded"
        >
          Save
        </button>
        <button
          type="button"
          className="bg-gray-200 px-4 py-1 rounded"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
