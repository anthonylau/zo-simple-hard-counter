workflow "New workflow" {
  on = "push"
  resolves = ["yarn"]
}

action "yarn" {
  uses = "yarn"
  args = "yarn"
}
