# -*- mode: ruby -*-
# vi: set ft=ruby :

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "ubuntu/jammy64"
  config.vm.hostname = "ecllm-dev"

  config.vm.network :private_network, ip: "192.168.33.11"
  config.vm.network :forwarded_port, guest: 3000, host: 3000, auto_correct: true

  config.vm.provider "virtualbox" do |v|
    v.memory = 4096
    v.cpus = 2
    v.customize ["setextradata", :id, "VBoxInternal2/SharedFoldersEnableSymlinksCreate/v-root", "1"]
    v.customize ["modifyvm", :id, "--natdnsproxy1", "on"]
    v.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
    v.customize ["modifyvm", :id, "--nictype1", "virtio"]
  end

  config.vm.synced_folder ".", "/home/vagrant/ECLLMApp",
    mount_options: ["dmode=775,fmode=664"]

  config.vm.provision "shell", inline: <<-SHELL
    apt-get update
    apt-get install -y awscli ca-certificates curl wget zip
  SHELL

  config.vm.provision "docker"

  # Install Compose v2 as both a Docker CLI plugin (`docker compose`) and a
  # compatibility command (`docker-compose`).
  config.vm.provision "shell", inline: <<-SHELL
    install -d -m 0755 /usr/local/lib/docker/cli-plugins
    curl -SL https://github.com/docker/compose/releases/download/v2.2.3/docker-compose-linux-x86_64 \
      -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod 0755 /usr/local/lib/docker/cli-plugins/docker-compose
    ln -sf /usr/local/lib/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose
    usermod -aG docker vagrant
  SHELL
end
