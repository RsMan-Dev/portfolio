Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"
  root to: redirect("/home")
  resource :home, only: :show
  get "/doc/:element", to: "docs#show", as: :doc
  resources :components
end
