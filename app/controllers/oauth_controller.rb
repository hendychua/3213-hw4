class OauthController < ApplicationController
	before_filter :initialise

	def initialise
		@client = OAuth2::Client.new('a886f92b1d106ca4d80b91b88cbb114f', '19c3479bf52b21c50159751cb731da74', :site => 'https://cs3213.herokuapp.com',  :authorize_url => "/oauth/new", :token_url => "/oauth/token.json")
	end
	def login	
		require 'oauth2'
		auth_url = @client.auth_code.authorize_url(:redirect_uri => 'http://' + request.host_with_port + '/oauth/redirect')
		puts auth_url
		redirect_to auth_url

	end  

	def redirect
		@code = params[:code];
		@token = @client.auth_code.get_token(@code, :redirect_uri => '/')
		@access_token = @token.token
		cookies[:access_token] = @access_token
		redirect_to "/"
	end
end