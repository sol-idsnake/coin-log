/** Reusable Mantine table shell: renders column headings and pre-built body rows. */
import type { ReactNode } from "react";
import { Table } from "@mantine/core";

export default function DataTable({
  headings,
  rows,
}: {
  headings: string[];
  rows: ReactNode[];
}) {
  return (
    <Table highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          {headings.map((heading) => (
            <Table.Th key={heading}>{heading}</Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{rows}</Table.Tbody>
    </Table>
  );
}
