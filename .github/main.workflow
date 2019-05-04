workflow "New workflow" {
  on = "push"
  resolves = ["GitHub Action for Yarn", "nuxt/actions-yarn@97f98f200b7fd42a001f88e7bdfc14d64d695ab2"]
}

action "yarn" {
  uses = "nuxt/actions-yarn@97f98f200b7fd42a001f88e7bdfc14d64d695ab2"
  args = "install"
}

action "GitHub Action for Yarn" {
  uses = "nuxt/actions-yarn@97f98f200b7fd42a001f88e7bdfc14d64d695ab2"
  needs = ["yarn"]
  args = "test"
}

action "nuxt/actions-yarn@97f98f200b7fd42a001f88e7bdfc14d64d695ab2" {
  uses = "nuxt/actions-yarn@97f98f200b7fd42a001f88e7bdfc14d64d695ab2"
  needs = ["yarn"]
  args = "audit"
}
