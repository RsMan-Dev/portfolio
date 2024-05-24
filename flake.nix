{
  description = "Billetterie environment v1.1";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        ruby = pkgs.ruby_3_3;

        libraryPath = pkgs.lib.makeLibraryPath (with pkgs; [ libsodium glib libffi ]);
        includePath = pkgs.lib.makeIncludePath (with pkgs; [ qrencode ]);

        wrappedRuby = (pkgs.symlinkJoin {
          name = "ruby";
          paths = [ ruby ];
          nativeBuildInputs = [ pkgs.makeWrapper ];
          postBuild = ''
            wrapProgram $out/bin/ruby \
              --set LD_LIBRARY_PATH ${libraryPath} \
              --set DYLD_LIBRARY_PATH ${libraryPath}
            wrapProgram $out/bin/bundle \
              --set LD_LIBRARY_PATH ${libraryPath} \
              --set DYLD_LIBRARY_PATH ${libraryPath} \
              --set LIBRARY_PATH ${libraryPath} \
              --set C_INCLUDE_PATH ${includePath}
          '';
        });

        nodejs = pkgs.nodejs_22;

        deps_update = pkgs.writeScriptBin "deps_update" ''
          #!${pkgs.runtimeShell}
          echo '${ruby.version}' > .ruby-version
          sed -i 's/ruby .*/ruby ${ruby.version}/' .tool-versions
          sed -i 's/nodejs .*/nodejs ${nodejs.version}/' .tool-versions
        '';

        start = pkgs.writeScriptBin "start" ''
          #!${pkgs.runtimeShell}
          bundle exec foreman start -f Procfile.dev
        '';

        packages = with pkgs; [
          wrappedRuby
          nodejs
        ];
      in
      {
        devShells = rec { 
          default = pkgs.mkShell {
            buildInputs = with pkgs; packages ++ [
              foreman
              # Custom packages
              deps_update
              start
            ];

            # For PATH use $PATH in first to avoid override wrapped bundle and ruby to be override
            shellHook = ''
              export PATH="$PATH:./bin"
              export PGDATA="$(pwd)/tmp/psql"
              bundle config set --local path vendor/bundle
            '';
          };
        };
      });
}
