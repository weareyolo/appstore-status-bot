require "spaceship"
require "json"
require 'tempfile'

def get_app_state(app)
  edit_version_info = app.get_edit_app_store_version
  in_review_version_info = app.get_in_review_app_store_version
  pending_version_info = app.get_pending_release_app_store_version
  latest_version_info = app.get_latest_app_store_version

  version_string = ""
  app_store_state = ""

  if edit_version_info.nil? == false
    version_string = edit_version_info.version_string
    app_store_state = edit_version_info.app_store_state.gsub("_", " ").capitalize
  elsif in_review_version_info.nil? == false
    version_string = in_review_version_info.version_string
    app_store_state = in_review_version_info.app_store_state.gsub("_", " ").capitalize
  elsif pending_version_info.nil? == false
    version_string = pending_version_info.version_string
    app_store_state = pending_version_info.app_store_state.gsub("_", " ").capitalize
  elsif latest_version_info.nil? == false
    version_string = latest_version_info.version_string
    app_store_state = latest_version_info.app_store_state.gsub("_", " ").capitalize
  end

  icon_url = ""
  live_version_info = app.get_live_app_store_version
  if live_version_info.nil? == false
    icon_url = live_version_info.build.icon_asset_token["templateUrl"]
    icon_url["{w}"] = "340"
    icon_url["{h}"] = "340"
    icon_url["{f}"] = "png"
  end

  {
    "name" => app.name,
    "version" => version_string,
    "status" => app_store_state,
    "appID" => app.id,
    "iconURL" => icon_url
  }

end

def get_app_version_from(bundle_id)
  apps = []
  if bundle_id
    apps.push(Spaceship::ConnectAPI::App.find(bundle_id))
  else
    apps = Spaceship::ConnectAPI::App.all
  end
  apps.map { |app| get_app_state(app) }
end

# Create temp file.
p8_file = Tempfile.new('AuthKey')
p8_file.write(ENV['APP_STORE_PRIVATE_KEY'])
p8_file.rewind

versions = []

Spaceship::ConnectAPI.token = Spaceship::ConnectAPI::Token.create(
  key_id: ENV['APP_STORE_KEY_ID'],
  issuer_id: ENV['APP_STORE_ISSUER_ID'],
  filepath: File.absolute_path(p8_file.path)
)

bundle_id_array = ENV['APP_STORE_BUNDLE_IDS'].to_s.split(",")

if bundle_id_array.length.zero?
  versions += get_app_version_from(nil)
else
  bundle_id_array.each do |bundle_id|
    versions += get_app_version_from(bundle_id)
  end
end

puts JSON.dump versions

p8_file.unlink
