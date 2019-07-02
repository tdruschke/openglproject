function mergeSort(arr, idx) {
    if (arr.length < 2) {
        return arr;
    }
    var left = [];
    var right = [];
    for (var i = 0; i < arr.length; i++) {
        if (i < arr.length/2) {
            left.push(arr[i]);
        }
        else {
            right.push(arr[i]);
        }
    }
    left = mergeSort(left, idx);
    right = mergeSort(right, idx);
    return merge(left, right, idx);
}

function merge(l, r, idx) {
    var result = [];
    var idx_l = idx_r = 0;
    while (idx_l < l.length && idx_r < r.length) {
        if (l[idx_l][idx] <= r[idx_r][idx]) {
            result.push(l[idx_l]);
            idx_l += 1;
        }
        else {
            result.push(r[idx_r]);
            idx_r +=1;
        }
    }
    while (idx_l < l.length) {
        result.push(l[idx_l]);
        idx_l += 1;
    } 
    while (idx_r < r.length) {
        result.push(r[idx_r]);
        idx_r +=1;
    }
    return result
}