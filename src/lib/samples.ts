export interface Sample {
  name: string;
  code: string;
  input: string;
}

export const SAMPLES: Sample[] = [
  {
    name: "Two Sum (hash map)",
    code: `class Solution:
    def twoSum(self, nums, target):
        seen = {}
        for i, x in enumerate(nums):
            need = target - x
            if need in seen:
                return [seen[need], i]
            seen[x] = i
        return []`,
    input: `nums = [2, 7, 11, 15]\ntarget = 9`,
  },
  {
    name: "Valid Parentheses (stack)",
    code: `class Solution:
    def isValid(self, s):
        stack = []
        pairs = {")": "(", "]": "[", "}": "{"}
        for ch in s:
            if ch in pairs:
                top = stack.pop() if stack else "#"
                if top != pairs[ch]:
                    return False
            else:
                stack.append(ch)
        return not stack`,
    input: `s = "([{}])"`,
  },
  {
    name: "Longest Substring (set + two pointers)",
    code: `class Solution:
    def lengthOfLongestSubstring(self, s):
        seen = set()
        left = 0
        best = 0
        for right in range(len(s)):
            while s[right] in seen:
                seen.remove(s[left])
                left += 1
            seen.add(s[right])
            best = max(best, right - left + 1)
        return best`,
    input: `s = "abcabcbb"`,
  },
  {
    name: "BFS shortest path (deque + graph)",
    code: `from collections import deque

class Solution:
    def shortestPath(self, graph, start, goal):
        queue = deque([start])
        dist = {start: 0}
        while queue:
            node = queue.popleft()
            if node == goal:
                return dist[node]
            for nxt in graph[node]:
                if nxt not in dist:
                    dist[nxt] = dist[node] + 1
                    queue.append(nxt)
        return -1`,
    input: `graph = {0: [1, 2], 1: [2, 3], 2: [3], 3: []}\nstart = 0\ngoal = 3`,
  },
  {
    name: "Reverse Linked List",
    code: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Solution:
    def reverseList(self, head):
        prev = None
        cur = head
        while cur:
            nxt = cur.next
            cur.next = prev
            prev = cur
            cur = nxt
        return prev`,
    input: `head = ListNode(1, ListNode(2, ListNode(3, ListNode(4))))`,
  },
  {
    name: "Max Depth of Binary Tree (recursion)",
    code: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def maxDepth(self, root):
        if not root:
            return 0
        left = self.maxDepth(root.left)
        right = self.maxDepth(root.right)
        return 1 + max(left, right)`,
    input: `root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))`,
  },
  {
    name: "Kth Largest (min-heap)",
    code: `import heapq

class Solution:
    def kthLargest(self, nums, k):
        heap = []
        for x in nums:
            heapq.heappush(heap, x)
            if len(heap) > k:
                heapq.heappop(heap)
        return heap[0]`,
    input: `nums = [3, 2, 1, 5, 6, 4]\nk = 2`,
  },
  {
    name: "Unique Paths (DP grid)",
    code: `class Solution:
    def uniquePaths(self, m, n):
        dp = [[1] * n for _ in range(m)]
        for i in range(1, m):
            for j in range(1, n):
                dp[i][j] = dp[i - 1][j] + dp[i][j - 1]
        return dp[m - 1][n - 1]`,
    input: `m = 3\nn = 4`,
  },
  {
    name: "Fibonacci (recursion tree)",
    code: `class Solution:
    def fib(self, n):
        if n < 2:
            return n
        return self.fib(n - 1) + self.fib(n - 2)`,
    input: `n = 6`,
  },
];
