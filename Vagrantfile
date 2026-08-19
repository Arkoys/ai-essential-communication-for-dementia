# -*- mode: ruby -*-
# vi: set ft=ruby :
# See https://github.com/discourse/discourse/blob/master/docs/VAGRANT.md
#
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box= "ubuntu/jammy64"

  config.vm.network :private_network, ip: "192.168.33.11"
  # config.vm.network :private_network, ip: "10.120.0.55"  
  
  config.vm.provider "virtualbox" do |v|
    v.customize ["setextradata", :id, "VBoxInternal2/SharedFoldersEnableSymlinksCreate/v-root", "1"]
  end

  config.vm.provider :virtualbox do |v|
    v.customize ["modifyvm", :id, "--memory", "1024"]
    v.customize ["modifyvm", :id, "--cpus", "2"]
    v.customize ["modifyvm", :id, "--natdnsproxy1", "on"]
    v.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
    v.customize ["modifyvm", :id, "--nictype1", "virtio"]
  end

  # config.vm.synced_folder ".", "/vagrant", disabled: true
  config.vm.synced_folder ".", "/home/vagrant/ECLLMApp",
    mount_options: ["dmode=775,fmode=664"]
   
#   config.vm.provision "file", source: "config/.aws/credentials", destination: "~/.aws/credentials"
  
  config.vm.provision "shell",
    inline: "sudo apt-get update"
    
  config.vm.provision "docker" do |d|     
    d.pull_images "node:20-alpine"          
  end
  
  # config.vm.provision "shell",
  #   inline: "apt-get install -y --install-recommends linux-generic-lts-xenial"

  config.vm.provision "shell",
    inline: "apt-get install -y tofrodos wget zip python3-pip"   
  
  # config.vm.provision "shell",
  #   inline: "apt-get install -y tofrodos wget zip nodejs npm python-pip"
  
  config.vm.provision "shell",
    inline: "sudo pip install awscli boto3 boto botocore"# commcare-export email_validator validate_email pyisemail"

  # config.vm.provision "shell", path: "provision/setup.sh"
   # config.vm.provision "shell",
  #   inline: "sudo apt-get upgrade python3-pip --yes && sudo pip3 install --upgrade 'pip < 21.0'"
  
  # config.vm.provision "shell",
  #   inline: "sudo pip3 install commcare_export boto3"
  # config.vm.provision "shell", path: "nodesource_setup.sh"

  # config.vm.provision "shell",
  #   inline: "sudo apt-get install -y nodejs build-essential"
  
  # config.vm.provision "shell",
  #   inline: "sudo npm install http-server -g"

  config.vm.provision "shell",
    inline: "wget https://github.com/docker/compose/releases/download/v2.2.3/docker-compose-linux-x86_64"
    
  config.vm.provision "shell",
    inline: "sudo mv docker-compose-linux-x86_64 /usr/local/bin/docker-compose"
    
  config.vm.provision "shell",
    inline: "sudo chmod +x /usr/local/bin/docker-compose"
  
#   config.vm.provision "shell", path: "provision/setup.sh"
   
end