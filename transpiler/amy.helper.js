function range(start, end, increment) {
    if (increment === undefined) increment = 1
    let a = []

    if (increment > 0) {
        for (let i = start; i <= end; i += increment) {
            a.push(i)
        }
    } else {
        for (let i = start; i >= end; i += increment) {
            a.push(i)
        }
    }

    return a
}
