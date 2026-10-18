// Authored parser-contract fixture from docs/spec/engine/rpgcode-language.md
// (FUN-1, FUN-3, EXP-3, EXP-6) and rpgcode-modules-and-objects.md#objects
// (OOP-1, OOP-3). It covers writable references and nested value calls.
global(cells) = 0
function selectCell(&index) {
  return &cells[index]
}
function globalCell() {
  return &:cells
}
class Ledger {
public:
  var values[]
  method at(index) { return &values[index] }
  method valuesRef() { return &values }
  method nested(index) { return values[index] }
}
function update(ledger, &index, amount) {
  local(slot) = ledger->nested(index)
  selectCell(index) = amount + ledger->at(index)
  local(combined) = selectCell(globalCell() + index)
  return globalCell() + selectCell(index) + local(slot) + combined
}
local(ledger) = Ledger()
local(index) = 0
update(ledger, index, 1)
