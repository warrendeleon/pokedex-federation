#!/usr/bin/env ruby
# Adds the HostUITests UI-testing target + a shared scheme to Host.xcodeproj. Idempotent: re-running
# updates settings rather than duplicating. Driven by xcodeproj (the gem CocoaPods already vendors).
require 'xcodeproj'

PROJECT = 'Host.xcodeproj'
TARGET_NAME = 'HostUITests'
proj = Xcodeproj::Project.open(PROJECT)
host = proj.targets.find { |t| t.name == 'Host' } or abort 'Host target not found'

test = proj.targets.find { |t| t.name == TARGET_NAME }
if test.nil?
  test = proj.new_target(:ui_test_bundle, TARGET_NAME, :ios, '16.0')
  puts "created target #{TARGET_NAME}"
else
  puts "target #{TARGET_NAME} already exists; updating"
end

# Source group + file (only add the reference once).
group = proj.main_group.find_subpath(TARGET_NAME, true)
group.set_source_tree('SOURCE_ROOT')
swift_path = "#{TARGET_NAME}/AccessibilityAuditUITests.swift"
unless group.files.any? { |f| f.path == 'AccessibilityAuditUITests.swift' || f.path == swift_path }
  fref = group.new_file(swift_path)
  test.add_file_references([fref])
  puts "added source file #{swift_path}"
end

test.build_configurations.each do |c|
  bs = c.build_settings
  bs['TEST_TARGET_NAME'] = 'Host'
  bs['PRODUCT_BUNDLE_IDENTIFIER'] = 'org.reactjs.native.example.HostUITests'
  bs['PRODUCT_NAME'] = '$(TARGET_NAME)'
  bs['SWIFT_VERSION'] = '5.0'
  bs['IPHONEOS_DEPLOYMENT_TARGET'] = '16.0'
  bs['CODE_SIGN_STYLE'] = 'Automatic'
  bs['CODE_SIGNING_ALLOWED'] = 'NO' # simulator UI test: no signing needed
  bs['GENERATE_INFOPLIST_FILE'] = 'YES'
  bs['TARGETED_DEVICE_FAMILY'] = '1,2'
  bs['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@loader_path/Frameworks']
  bs['ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES'] = 'YES'
end

test.add_dependency(host) unless test.dependencies.any? { |d| d.target == host }

proj.save
puts 'project saved'

# Shared scheme so `xcodebuild test -scheme HostUITests` works.
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(host)
scheme.add_test_target(test)
scheme.set_launch_target(host)
scheme.save_as(PROJECT, TARGET_NAME, true)
puts "wrote shared scheme #{TARGET_NAME}"
