// Runs when the player activates the chest.
if (chestOpened ~= 1)
{
    mwin("You found 10 gold.")
    givegp(10)
    chestOpened = 1
    wait()
    mwincls()
}
