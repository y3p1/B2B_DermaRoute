import React, { useEffect, useState } from "react";

export default function ManufacturerList({
  onEdit,
}: {
  onEdit?: (manufacturer: any) => void;
}) {
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/manufacturers")
      .then((res) => res.json())
      .then(setManufacturers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading manufacturers...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Manufacturers</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {manufacturers.map((m) => (
            <tr key={m.id}>
              <td className="border px-2 py-1">{m.id}</td>
              <td className="border px-2 py-1">{m.name}</td>
              <td className="border px-2 py-1">
                <button
                  className="text-blue-600 mr-2"
                  onClick={() => onEdit?.(m)}
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
