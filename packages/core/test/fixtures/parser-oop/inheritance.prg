// Authored parser-contract fixture from docs/spec/engine/rpgcode-modules-and-objects.md#objects.
// Pattern: ordered direct bases, overloads by arity, and a pure virtual
// declaration; does not assert runtime MRO.
class LeftBranch {
public:
  method describe() { return 1 }
  method describe(value) { return value }
}
class RightBranch {
public:
  method describe() { return 2 }
}
class Hybrid : LeftBranch, RightBranch {
public:
  method describe(value, extra) { return value + extra }
  method required() = 0
}
function inspect(node) {
  local(one) = node->describe()
  local(two) = node->describe(3)
  return one + two
}
local(branch) = LeftBranch()
inspect(branch)
