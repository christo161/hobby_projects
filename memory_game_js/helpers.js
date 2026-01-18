//random number (min/max inclusive)
export function generate_random_number (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Fisher-Yates shuffle
export function fisher_yates_shuffle (p_arr) {
    if (p_arr.length < 2) {
        return;
    }

    for (let i = p_arr.length - 1; i >= 0; --i) {
        const j = generate_random_number(0, i);
        //swap: simultanous assignment in the case of array literals with 2 elements
        [p_arr[i], p_arr[j]] = [p_arr[j], p_arr[i]];
    }
}