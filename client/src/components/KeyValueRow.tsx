import React from "react";

export default function KeyValueRow({ label, value }: { label: string; value: string | number | boolean }) {
    return (
        <tr>
            <td><strong>{label}</strong></td>
            <td>{value.toString()}</td>
        </tr>
    );
}