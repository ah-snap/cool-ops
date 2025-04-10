function DatesCell({row, column}) {
    const value = row[column.key];
    return value && value.map(d => d.toLocaleDateString()).join(", ");
}

export default DatesCell;
