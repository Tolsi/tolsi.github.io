# http://www.chrisanthropic.com/blog/2014/rakefile-minimize-assets-and-optimize-images/

require "html_compressor"

##############
#   Build    #
##############

# Generate the site
# Minify, optimize, and compress

desc "build the site"
task :build do
  system "bundle exec jekyll build"
  system "bundle exec rake minify_html"
  system "bundle exec rake optimizeimages"
end

##############
#   Deploy   #
##############

# Deploy the site
# Ping / Notify after site is deployed

desc "deploy the site"
task :deploy do
  system "bundle exec octopress deploy"
  system "bundle exec rake notify"
end

##############
# Optimizes  #
##############

# https://github.com/phobetron/image-optimizer
# Using this to optimize our images. Dependencies are jpegtran, pngcrush and gifsicle

desc "Optimize GIF, JPG and PNG files"
task :optimizeimages => [ 'optimizeimages:find_tools', 'optimizeimages:run' ]

namespace :optimizeimages do
  desc "Test for presence of image optimization tools in the command path"
  task :find_tools do
    RakeFileUtils.verbose(false)
    tools = %w[jpegtran gifsicle pngcrush]
    puts "\nOptimizing images using the following tools:"
    tools.delete_if { |tool| sh('which', tool) rescue false }
    raise "The following tools must be installed and accessible from the execution path: #{ tools.join(', ') }" if tools.size > 0
  end

  task :run do
    RakeFileUtils.verbose(false)
    start_time = Time.now

    file_list = FileList.new '_site/**/*.{gif,jpeg,jpg,png}'

    last_optimized_path = '_site/.last_optimized'
    if File.exists? last_optimized_path
      last_optimized = File.new last_optimized_path
      file_list.exclude do |f|
        File.new(f).mtime < last_optimized.mtime
      end
    end

    puts "\nOptimizing #{ file_list.size } image files."

    proc_cnt = 0
    skip_cnt = 0
    savings = {:old => Array.new, :new => Array.new}

    file_list.each_with_index do |f, cnt|
      puts "Processing: #{cnt+1}/#{file_list.size} #{f.to_s}"

      extension = File.extname(f).delete('.').gsub(/jpeg/,'jpg')
      ext_check = `file -b #{f} | awk '{print $1}'`.strip.downcase
      ext_check.gsub!(/jpeg/,'jpg')
      if ext_check != extension
        puts "\t#{f.to_s} is a: '#{ext_check}' not: '#{extension}' ..skipping"
        skip_cnt = skip_cnt + 1
        next
      end

      case extension
        when 'gif'
          `gifsicle -O2 #{f} > #{f}.n`
        when 'png'
          `pngcrush -q -rem alla -reduce -brute  #{f} #{f}.n`
        when 'jpg'
          `jpegtran -copy none -optimize -perfect -progressive #{f} > #{f}.p`
          prog_size = File.size?("#{f}.p")

          `jpegtran -copy none -optimize -perfect #{f} > #{f}.np`
          nonprog_size = File.size?("#{f}.np")

          if prog_size < nonprog_size
            File.delete("#{f}.np")
            File.rename("#{f}.p", "#{f}.n")
          else
            File.delete("#{f}.p")
            File.rename("#{f}.np", "#{f}.n")
          end
        else
          skip_cnt = skip_cnt + 1
          next
      end

      old_size = File.size?(f).to_f
      new_size = File.size?("#{f}.n").to_f

      if new_size < old_size
        File.delete(f)
        File.rename("#{f}.n", f)
      else
        new_size = old_size
        File.delete("#{f}.n")
      end

      savings[:old] << old_size
      savings[:new] << new_size

      reduction = 100.0 - (new_size/old_size*100.0)

      puts "Output: #{sprintf "%0.2f", reduction}% | #{old_size.to_i} -> #{new_size.to_i}"
      proc_cnt = proc_cnt + 1
    end

    total_old = savings[:old].inject(0){|sum,item| sum + item}
    total_new = savings[:new].inject(0){|sum,item| sum + item}
    total_reduction = total_old > 0 ? (100.0 - (total_new/total_old*100.0)) : 0

    minutes, seconds = (Time.now - start_time).divmod 60
    puts "\nTotal run time: #{minutes}m #{seconds.round}s"

    puts "Files: #{file_list.size}\tProcessed: #{proc_cnt}\tSkipped: #{skip_cnt}"
    puts "\nTotal savings:\t#{sprintf "%0.2f", total_reduction}% | #{total_old.to_i} -> #{total_new.to_i} (#{total_old.to_i - total_new.to_i})"

    FileUtils.touch last_optimized_path
  end
end

##############
#   Minify   #
##############

desc "Minify HTML"
task :minify_html do
  puts "## Minifying HTML"
  compressor = HtmlCompressor::HtmlCompressor.new
  Dir.glob("_site/**/*.html").each do |name|
    puts "Minifying #{name}"
    input = File.read(name)
    output = File.open("#{name}", "w")
    output << compressor.compress(input)
    output.close
  end
end

desc "Minify static assets"
task :minify => [:minify_css, :minify_html] do
end

##############
#   Notify   #
##############

# Ping Google and Yahoo to let them know you updated your site

site = "blog.tolsi.ru"

desc 'Notify Google of the new sitemap'
task :sitemapgoogle do
  begin
    require 'net/http'
    require 'uri'
    puts '* Pinging Google about our sitemap'
    Net::HTTP.get('www.google.com', '/webmasters/tools/ping?sitemap=' + URI.escape('#{site}/sitemap.xml'))
  rescue LoadError
    puts '! Could not ping Google about our sitemap, because Net::HTTP or URI could not be found.'
  end
end

desc 'Notify Bing of the new sitemap'
task :sitemapbing do
  begin
    require 'net/http'
    require 'uri'
    puts '* Pinging Bing about our sitemap'
    Net::HTTP.get('www.bing.com', '/webmaster/ping.aspx?siteMap=' + URI.escape('#{site}/sitemap.xml'))
  rescue LoadError
    puts '! Could not ping Bing about our sitemap, because Net::HTTP or URI could not be found.'
  end
end

desc "Notify various services about new content"
task :notify => [:sitemapgoogle, :sitemapbing] do
end

# https://raw.githubusercontent.com/avillafiorita/jekyll-rakefile/master/Rakefile

desc 'Build and deploy to github'
task :deploy_github => :build do |t, args|
  args.with_defaults(:deployment_configuration => 'deploy')

  if git_requires_attention("gh_pages") then
    puts "\n\nWarning! It seems that the local repository is not in sync with the remote.\n"
    puts "This could be ok if the local version is more recent than the remote repository.\n"
    puts "Deploying before committing might cause a regression of the website (at this or the next deploy).\n\n"
    puts "Are you sure you want to continue? [Y|n]"

    ans = STDIN.gets.chomp
    exit if ans != 'Y'
  end

  %x{git add -A && git commit -m "autopush by Rakefile at #{time}" && git push origin gh_pages} if $git_autopush

  time = Time.new
  File.open("_last_deploy.txt", 'w') {|f| f.write(time) }
end

desc 'Check links for site already running on localhost:4000'
task :check_links do
  begin
    require 'anemone'

    root = 'http://localhost:4000/'
    puts "Checking links with anemone ... "
    # check-links --no-warnings http://localhost:4000
    Anemone.crawl(root, :discard_page_bodies => true) do |anemone|
      anemone.after_crawl do |pagestore|
        broken_links = Hash.new { |h, k| h[k] = [] }
        pagestore.each_value do |page|
          if page.code != 200
            referrers = pagestore.pages_linking_to(page.url)
            referrers.each do |referrer|
              broken_links[referrer] << page
            end
          else
            puts "OK #{page.url}"
          end
        end
        puts "\n\nLinks with issues: "
        broken_links.each do |referrer, pages|
          puts "#{referrer.url} contains the following broken links:"
          pages.each do |page|
            puts "  HTTP #{page.code} #{page.url}"
          end
        end
      end
    end
    puts "... done!"

  rescue LoadError
    abort 'Install anemone gem: gem install anemone'
  end
end

#
# General support functions
#

# remove generated site
def cleanup
  sh 'rm -rf _site'
end

def git_local_diffs
  %x{git diff --name-only} != ""
end

def git_remote_diffs branch
  %x{git fetch}
  %x{git rev-parse #{branch}} != %x{git rev-parse origin/#{branch}}
end

def git_repo?
  %x{git status} != ""
end

def git_requires_attention branch
  $git_check and git_repo? and git_remote_diffs(branch)
end

