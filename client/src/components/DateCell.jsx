function DateCell({row, column}) {
    const value = row[column.key];
    return (value && value.toLocaleDateString && value.toLocaleDateString()) || value;
}

export default DateCell;
