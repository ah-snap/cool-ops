function FloatCell({row, column}) {
    const value = row[column.key];

    if (value === 0) return "0.00";
    return value && value.toFixed && value.toFixed(2);
}

export default FloatCell;
