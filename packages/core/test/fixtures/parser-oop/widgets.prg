// Authored parser-contract fixture from docs/spec/engine/rpgcode-modules-and-objects.md#objects.
// Pattern: GUI-style inheritance and composition; neutral labels and bodies,
// with no graphics assets required.
class Widget {
private:
  var x
  var y
public:
  method Widget(left, top) { this->x = left; this->y = top }
  method move(left, top) { this->x = left; this->y = top }
  method position() { return this->x + this->y }
}
class Caption : Widget {
private:
  var text
public:
  method Caption(left, top, value) { this->x = left; this->y = top; this->text = value }
  method setText(value) { this->text = value }
  method getText() { return this->text }
  method position() { return this->getText() }
}
function compose(panel, label) {
  panel->move(2, 4)
  label->setText("ready")
  return label->position()
}
local(panel) = Widget(0, 0)
local(label) = Caption(1, 2, "ready")
compose(panel, label)
