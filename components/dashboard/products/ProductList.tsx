import React, { useEffect, useState } from "react";

export interface Product {
  id: number;
  name: string;
  manufacturerId: number;
  description?: string;
  quarter: number;
  year: number;
}

export default function ProductList({
  onEdit,
}: {
  onEdit?: (product: Product) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data: Product[]) => setProducts(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading products...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Products</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Manufacturer</th>
            <th className="border px-2 py-1">Description</th>
            <th className="border px-2 py-1">Quarter</th>
            <th className="border px-2 py-1">Year</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td className="border px-2 py-1">{p.id}</td>
              <td className="border px-2 py-1">{p.name}</td>
              <td className="border px-2 py-1">{p.manufacturerId}</td>
              <td className="border px-2 py-1">{p.description}</td>
              <td className="border px-2 py-1">{p.quarter}</td>
              <td className="border px-2 py-1">{p.year}</td>
              <td className="border px-2 py-1">
                <button
                  className="text-blue-600 mr-2"
                  onClick={() => onEdit?.(p)}
                >
                  Edit
                </button>
                {/* Delete button will be added later */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
