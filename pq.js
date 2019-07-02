// priority queue using a binary heap represented as an array

// *************
// constructor *
// *************

function priorityQueue() {
    // attributes
    this.data = [];
    this.size = 0;

    // methods
    this.insert = function(val) {
        this.data.push(val);
        this.size += 1;
        this.up_heap(this.size-1);
    }
    this.extract_min = function() {
        if (this.size > 0) {
            var min = this.data[0];
            this.data[0] = this.data[this.size-1];
            this.data.pop();
            this.size -= 1;
            this.down_heap(0);
            return min;
        }
    }
    this.sort = function() {
        var end = this.size - 1;
        for (var i = end; i > 0; i--){
            this.swap(0, i);
            end -= 1;
            this.min_heapify(0,end);
        }
        this.reverse_array();
    }

    // helpers
    this.up_heap = function (idx) {
        var parent = Math.floor((idx-1)/2);
        if (this.data[idx] < this.data[parent]) {
            //swap
            this.swap(idx, parent);
            this.up_heap(parent);
        }
    }
    this.down_heap = function (idx) {
        var left = 2*idx+1;
        var right = 2*idx+2;
        var smallest = idx;

        if (left < this.size && this.data[left] < this.data[smallest]) {
            smallest = left;
        }
        if (right < this.size && this.data[right] < this.data[smallest]) {
            smallest = right;
        }
        if (smallest != idx) {
            this.swap(idx, smallest);
            this.down_heap(smallest);
        }
    }
    this.swap = function (a,b) {
        this.data[a] += this.data[b];
        this.data[b] = this.data[a] - this.data[b];
        this.data[a] = this.data[a] - this.data[b];   
    }
    this.min_heapify = function (idx, end) {
        var left = 2*idx+1;
        var right = 2*idx+2;
        var smallest = idx;
    
        if (left < end && this.data[left] < this.data[smallest]) {
            smallest = left;
        }
        if (right < end && this.data[right] < this.data[smallest]) {
            smallest = right;
        }
        if (smallest != idx) {
            this.swap(idx, smallest);
            this.min_heapify(smallest, end);
        }
    }
    this.min_heapify2 = function (idx) {
        var left = 2*idx+1;
        var right = 2*idx+2;
        var smallest = idx;
    
        if (left < this.size && this.data[left] < this.data[smallest]) {
            smallest = left;
        }
        if (right < this.size && this.data[right] < this.data[smallest]) {
            smallest = right;
        }
        if (smallest != idx) {
            this.swap(idx, smallest);    
        }
        this.min_heapify2(smallest);
    }
    this.reverse_array = function() {
        var len = this.size-1;
        var max_i = Math.floor(len/2);
        for (var i = 0; i < max_i; i++) {
            this.swap(i, len-i);
        }
    }
}

// ***************
// Uncomment for *
// testing with  *
// pq.html       *
// ***************

var pq;
window.onload = function() {
    pq = new priorityQueue();
};
function insertValue() {
    var x = parseFloat(document.getElementById("num").value);
    pq.insert(x);
    console.log(pq.data);
}
function extract() {
    pq.extract_min();
    console.log(pq.data);
}
function h_sort() {
    pq.sort();
    console.log(pq.data);
}