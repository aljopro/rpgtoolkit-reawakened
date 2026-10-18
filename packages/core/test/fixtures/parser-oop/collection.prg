// Authored parser-contract fixture from docs/spec/engine/rpgcode-modules-and-objects.md#objects.
// Pattern: typed collection wrapper with indexed assignment and replacement;
// no archived source, names, algorithms or method bodies.
class Shelf {
public:
  var entries[]
  method Shelf() { this->entries[0] = 0 }
  method Shelf(initial) { this->entries[0] = initial }
  method put(index, value) { this->entries[index] = value }
  method operator[](index) { return &entries[index] }
  method operator=(other) { this->entries[0] = other->entries[0] }
  method ~Shelf() { this->entries[0] = 0 }
}
function copyFrom(Shelf source, Shelf destination) {
  destination = source
  return destination[0]
}
function main() {
  local(items) = Shelf(3)
  items->put(1, 7)
  local(result) = copyFrom(items, items)
  return result
}
main()
