/**
 * Script for landing.ejs
 */
// Requirements
const cp = require('child_process')
const crypto = require('crypto')
const { URL } = require('url')
const {
    MojangRestAPI,
    getServerStatus
} = require('helios-core/mojang')
const {
    RestResponseStatus,
    isDisplayableError,
    validateLocalFile
} = require('helios-core/common')
const {
    FullRepair,
    DistributionIndexProcessor,
    MojangIndexProcessor,
    downloadFile
} = require('helios-core/dl')
const {
    validateSelectedJvm,
    ensureJavaDirIsRoot,
    javaExecFromRoot,
    discoverBestJvmInstallation,
    latestOpenJDK,
    extractJdk
} = require('./assets/js/java/JavaGuard')

// Internal Requirements
const DiscordWrapper = require('./assets/js/discordwrapper')
const ProcessBuilder = require('./assets/js/processbuilder')

// Launch Elements
const launch_content = document.getElementById('launch_content')
const launch_details = document.getElementById('launch_details')
const launch_progress = document.getElementById('launch_progress')
const launch_progress_label = document.getElementById('launch_progress_label')
const launch_details_text = document.getElementById('launch_details_text')
const server_selection_button = document.getElementById('server_selection_button')
const user_text = document.getElementById('user_text')

const loggerLanding = LoggerUtil.getLogger('Landing')


// ADDING PLAYER IDENTITY VARIABLE
var playerIdentity = undefined;

/* Launch Progress Wrapper Functions */

/**
 * Show/hide the loading area.
 * 
 * @param {boolean} loading True if the loading area should be shown, otherwise false.
 */
function toggleLaunchArea(loading) {
    if (loading) {
        launch_details.style.display = 'flex'
        launch_content.style.display = 'none'
    } else {
        launch_details.style.display = 'none'
        launch_content.style.display = 'inline-flex'
    }
}

/**
 * Set the details text of the loading area.
 * 
 * @param {string} details The new text for the loading details.
 */
function setLaunchDetails(details) {
    launch_details_text.innerHTML = details
}

/**
 * Set the value of the loading progress bar and display that value.
 * 
 * @param {number} percent Percentage (0-100)
 */
function setLaunchPercentage(percent) {
    launch_progress.setAttribute('max', 100)
    launch_progress.setAttribute('value', percent)
    launch_progress_label.innerHTML = percent + '%'
}

/**
 * Set the value of the OS progress bar and display that on the UI.
 * 
 * @param {number} percent Percentage (0-100)
 */
function setDownloadPercentage(percent) {
    remote.getCurrentWindow().setProgressBar(percent / 100)
    setLaunchPercentage(percent)
}

/**
 * Enable or disable the launch button.
 * 
 * @param {boolean} val True to enable, false to disable.
 */
function setLaunchEnabled(val) {
    document.getElementById('launch_button').disabled = !val
}

// Bind launch button
document.getElementById('launch_button').addEventListener('click', async e => {
    loggerLanding.info('Launching game..')
    try {
        const server = (await DistroAPI.getDistribution()).getServerById(ConfigManager.getSelectedServer())

        const jExe = ConfigManager.getJavaExecutable(ConfigManager.getSelectedServer())

        if (jExe == null) {
            await asyncSystemScan(server.effectiveJavaOptions)
        } else {

            setLaunchDetails(Lang.queryJS('landing.launch.pleaseWait'))
            toggleLaunchArea(true)
            setLaunchPercentage(0, 100)

            const details = await validateSelectedJvm(ensureJavaDirIsRoot(jExe), server.effectiveJavaOptions.supported)
            if (details != null) {
                loggerLanding.info('Jvm Details', details)
                await dlAsync()

            } else {
                await asyncSystemScan(server.effectiveJavaOptions)
            }
        }
    } catch (err) {
        loggerLanding.error('Unhandled error in during launch process.', err)
        showLaunchFailure('Error During Launch', 'See console (CTRL + Shift + i) for more details.')
    }
})

// Bind settings button
document.getElementById('settingsMediaButton').onclick = async e => {
    await prepareSettings()
    switchView(getCurrentView(), VIEWS.settings)
}

// Bind avatar overlay button.
document.getElementById('avatarOverlay').onclick = async e => {
    await prepareSettings()
    switchView(getCurrentView(), VIEWS.settings, 500, 500, () => {
        settingsNavItemListener(document.getElementById('settingsNavAccount'), false)
    })
}

// Bind selected account
function updateSelectedAccount(authUser) {
    let username = 'No Account Selected'
    if (authUser != null) {
        if (authUser.displayName != null) {
            // username = authUser.displayName
            try {
                fetch(`https://custom.blackwell-university.fr/skins/${authUser.uuid}/details.json`)
                .then(function (response) {
                    return response.json();
                })
                .then(function (playerIdentityObject) {
                    username = playerIdentityObject.lastname + " " + playerIdentityObject.firstname;
                    user_text.innerHTML = username;
                    playerIdentity = playerIdentityObject;
                });
            } catch (error) {
                username = authUser.displayName;
            }
        }
        if (authUser.uuid != null) {
            document.getElementById('avatarContainer').style.backgroundImage = `url('http://custom.blackwell-university.fr/skins/${authUser.uuid}/avatar.png')`;
        }
    }
    user_text.innerHTML = username;
}
updateSelectedAccount(ConfigManager.getSelectedAccount())

// Bind selected server
function updateSelectedServer(serv) {
    if (getCurrentView() === VIEWS.settings) {
        fullSettingsSave()
    }
    ConfigManager.setSelectedServer(serv != null ? serv.rawServer.id : null)
    ConfigManager.save()
    server_selection_button.innerHTML = '\u2022 ' + (serv != null ? serv.rawServer.name : 'No Server Selected')
    if (getCurrentView() === VIEWS.settings) {
        animateSettingsTabRefresh()
    }
    setLaunchEnabled(serv != null)
}
// Real text is set in uibinder.js on distributionIndexDone.
server_selection_button.innerHTML = '\u2022 Loading..'
server_selection_button.onclick = async e => {
    e.target.blur()
    await toggleServerSelection(true)
}

// Update Mojang Status Color
const refreshMojangStatuses = async function () {
    loggerLanding.info('Refreshing Mojang Statuses..')

    let status = 'grey'
    let tooltipEssentialHTML = ''
    let tooltipNonEssentialHTML = ''

    const response = await MojangRestAPI.status()
    let statuses
    if (response.responseStatus === RestResponseStatus.SUCCESS) {
        statuses = response.data
    } else {
        loggerLanding.warn('Unable to refresh Mojang service status.')
        statuses = MojangRestAPI.getDefaultStatuses()
    }

    greenCount = 0
    greyCount = 0

    for (let i = 0; i < statuses.length; i++) {
        const service = statuses[i]

        if (service.essential) {
            tooltipEssentialHTML += `<div class="mojangStatusContainer">
                <span class="mojangStatusIcon" style="color: ${MojangRestAPI.statusToHex(service.status)};">&#8226;</span>
                <span class="mojangStatusName">${service.name}</span>
            </div>`
        } else {
            tooltipNonEssentialHTML += `<div class="mojangStatusContainer">
                <span class="mojangStatusIcon" style="color: ${MojangRestAPI.statusToHex(service.status)};">&#8226;</span>
                <span class="mojangStatusName">${service.name}</span>
            </div>`
        }

        if (service.status === 'yellow' && status !== 'red') {
            status = 'yellow'
        } else if (service.status === 'red') {
            status = 'red'
        } else {
            if (service.status === 'grey') {
                ++greyCount
            }
            ++greenCount
        }

    }

    if (greenCount === statuses.length) {
        if (greyCount === statuses.length) {
            status = 'grey'
        } else {
            status = 'green'
        }
    }

    document.getElementById('mojangStatusEssentialContainer').innerHTML = tooltipEssentialHTML
    document.getElementById('mojangStatusNonEssentialContainer').innerHTML = tooltipNonEssentialHTML
    document.getElementById('mojang_status_icon').style.color = MojangRestAPI.statusToHex(status)
}

const refreshServerStatus = async (fade = false) => {
    loggerLanding.info('Refreshing Server Status')
    const serv = (await DistroAPI.getDistribution()).getServerById(ConfigManager.getSelectedServer())

    let pLabel = 'SERVEUR'
    let pVal = 'HORS LIGNE'

    try {

        const servStat = await getServerStatus(47, serv.hostname, serv.port)
        console.log(servStat)
        pLabel = 'JOUEURS'
        pVal = servStat.players.online + '/' + servStat.players.max

    } catch (err) {
        loggerLanding.warn('Unable to refresh server status, assuming offline.')
        loggerLanding.debug(err)
    }
    if (fade) {
        $('#server_status_wrapper').fadeOut(250, () => {
            document.getElementById('landingPlayerLabel').innerHTML = pLabel
            document.getElementById('player_count').innerHTML = pVal
            $('#server_status_wrapper').fadeIn(500)
        })
    } else {
        document.getElementById('landingPlayerLabel').innerHTML = pLabel
        document.getElementById('player_count').innerHTML = pVal
    }

}

refreshMojangStatuses()
// Server Status is refreshed in uibinder.js on distributionIndexDone.

// Refresh statuses every hour. The status page itself refreshes every day so...
let mojangStatusListener = setInterval(() => refreshMojangStatuses(true), 60 * 60 * 1000)
// Set refresh rate to once every 5 minutes.
let serverStatusListener = setInterval(() => refreshServerStatus(true), 300000)

/**
 * Shows an error overlay, toggles off the launch area.
 * 
 * @param {string} title The overlay title.
 * @param {string} desc The overlay description.
 */
function showLaunchFailure(title, desc) {
    setOverlayContent(
        title,
        desc,
        'Okay'
    )
    setOverlayHandler(null)
    toggleOverlay(true)
    toggleLaunchArea(false)
}

/* System (Java) Scan */

/**
 * Asynchronously scan the system for valid Java installations.
 * 
 * @param {boolean} launchAfter Whether we should begin to launch after scanning. 
 */
async function asyncSystemScan(effectiveJavaOptions, launchAfter = true) {

    setLaunchDetails('Checking system info..')
    toggleLaunchArea(true)
    setLaunchPercentage(0, 100)

    const jvmDetails = await discoverBestJvmInstallation(
        ConfigManager.getDataDirectory(),
        effectiveJavaOptions.supported
    )

    if (jvmDetails == null) {
        // If the result is null, no valid Java installation was found.
        // Show this information to the user.
        setOverlayContent(
            'No Compatible<br>Java Installation Found',
            `In order to join WesterosCraft, you need a 64-bit installation of Java ${effectiveJavaOptions.suggestedMajor}. Would you like us to install a copy?`,
            'Install Java',
            'Install Manually'
        )
        setOverlayHandler(() => {
            setLaunchDetails('Preparing Java Download..')
            toggleOverlay(false)

            try {
                downloadJava(effectiveJavaOptions, launchAfter)
            } catch (err) {
                loggerLanding.error('Unhandled error in Java Download', err)
                showLaunchFailure('Error During Java Download', 'See console (CTRL + Shift + i) for more details.')
            }
        })
        setDismissHandler(() => {
            $('#overlayContent').fadeOut(250, () => {
                //$('#overlayDismiss').toggle(false)
                setOverlayContent(
                    'Java is Required<br>to Launch',
                    `A valid x64 installation of Java ${effectiveJavaOptions.suggestedMajor} is required to launch.<br><br>Please refer to our <a href="https://github.com/dscalzi/HeliosLauncher/wiki/Java-Management#manually-installing-a-valid-version-of-java">Java Management Guide</a> for instructions on how to manually install Java.`,
                    'I Understand',
                    'Go Back'
                )
                setOverlayHandler(() => {
                    toggleLaunchArea(false)
                    toggleOverlay(false)
                })
                setDismissHandler(() => {
                    toggleOverlay(false, true)

                    asyncSystemScan(effectiveJavaOptions, launchAfter)
                })
                $('#overlayContent').fadeIn(250)
            })
        })
        toggleOverlay(true, true)
    } else {
        // Java installation found, use this to launch the game.
        const javaExec = javaExecFromRoot(jvmDetails.path)
        ConfigManager.setJavaExecutable(ConfigManager.getSelectedServer(), javaExec)
        ConfigManager.save()

        // We need to make sure that the updated value is on the settings UI.
        // Just incase the settings UI is already open.
        settingsJavaExecVal.value = javaExec
        await populateJavaExecDetails(settingsJavaExecVal.value)

        // TODO Callback hell, refactor
        // TODO Move this out, separate concerns.
        if (launchAfter) {
            await dlAsync()
        }
    }

}

async function downloadJava(effectiveJavaOptions, launchAfter = true) {

    // TODO Error handling.
    // asset can be null.
    const asset = await latestOpenJDK(
        effectiveJavaOptions.suggestedMajor,
        ConfigManager.getDataDirectory(),
        effectiveJavaOptions.distribution)

    if (asset == null) {
        throw new Error('Failed to find OpenJDK distribution.')
    }

    let received = 0
    await downloadFile(asset.url, asset.path, ({ transferred }) => {
        received = transferred
        setDownloadPercentage(Math.trunc((transferred / asset.size) * 100))
    })
    setDownloadPercentage(100)

    if (received != asset.size) {
        loggerLanding.warn(`Java Download: Expected ${asset.size} bytes but received ${received}`)
        if (!await validateLocalFile(asset.path, asset.algo, asset.hash)) {
            log.error(`Hashes do not match, ${asset.id} may be corrupted.`)
            // Don't know how this could happen, but report it.
            throw new Error('Downloaded JDK has bad hash, file may be corrupted.')
        }
    }

    // Extract
    // Show installing progress bar.
    remote.getCurrentWindow().setProgressBar(2)

    // Wait for extration to complete.
    const eLStr = 'Extracting Java'
    let dotStr = ''
    setLaunchDetails(eLStr)
    const extractListener = setInterval(() => {
        if (dotStr.length >= 3) {
            dotStr = ''
        } else {
            dotStr += '.'
        }
        setLaunchDetails(eLStr + dotStr)
    }, 750)

    const newJavaExec = await extractJdk(asset.path)

    // Extraction complete, remove the loading from the OS progress bar.
    remote.getCurrentWindow().setProgressBar(-1)

    // Extraction completed successfully.
    ConfigManager.setJavaExecutable(ConfigManager.getSelectedServer(), newJavaExec)
    ConfigManager.save()

    clearInterval(extractListener)
    setLaunchDetails('Java Installed!')

    // TODO Callback hell
    // Refactor the launch functions
    asyncSystemScan(effectiveJavaOptions, launchAfter)

}

// Keep reference to Minecraft Process
let proc
// Is DiscordRPC enabled
let hasRPC = false
// Joined server regex
// Change this if your server uses something different.
const GAME_JOINED_REGEX = /\[.+\]: Sound engine started/
const GAME_LAUNCH_REGEX = /^\[.+\]: (?:MinecraftForge .+ Initialized|ModLauncher .+ starting: .+)$/
const MIN_LINGER = 5000

async function dlAsync(login = true) {

    // Login parameter is temporary for debug purposes. Allows testing the validation/downloads without
    // launching the game.

    const loggerLaunchSuite = LoggerUtil.getLogger('LaunchSuite')

    setLaunchDetails('Loading server information..')

    let distro

    try {
        distro = await DistroAPI.refreshDistributionOrFallback()
        onDistroRefresh(distro)
    } catch (err) {
        loggerLaunchSuite.error('Unable to refresh distribution index.', err)
        showLaunchFailure('Fatal Error', 'Could not load a copy of the distribution index. See the console (CTRL + Shift + i) for more details.')
        return
    }

    const serv = distro.getServerById(ConfigManager.getSelectedServer())

    if (login) {
        if (ConfigManager.getSelectedAccount() == null) {
            loggerLanding.error('You must be logged into an account.')
            return
        }
    }

    setLaunchDetails('Please wait..')
    toggleLaunchArea(true)
    setLaunchPercentage(0, 100)

    const fullRepairModule = new FullRepair(
        ConfigManager.getCommonDirectory(),
        ConfigManager.getInstanceDirectory(),
        ConfigManager.getLauncherDirectory(),
        ConfigManager.getSelectedServer(),
        DistroAPI.isDevMode()
    )

    fullRepairModule.spawnReceiver()

    fullRepairModule.childProcess.on('error', (err) => {
        loggerLaunchSuite.error('Error during launch', err)
        showLaunchFailure('Error During Launch', err.message || 'See console (CTRL + Shift + i) for more details.')
    })
    fullRepairModule.childProcess.on('close', (code, _signal) => {
        if (code !== 0) {
            loggerLaunchSuite.error(`Full Repair Module exited with code ${code}, assuming error.`)
            showLaunchFailure('Error During Launch', 'See console (CTRL + Shift + i) for more details.')
        }
    })

    loggerLaunchSuite.info('Validating files.')
    setLaunchDetails('Validating file integrity..')
    let invalidFileCount = 0
    try {
        invalidFileCount = await fullRepairModule.verifyFiles(percent => {
            setLaunchPercentage(percent)
        })
        setLaunchPercentage(100)
    } catch (err) {
        loggerLaunchSuite.error('Error during file validation.')
        showLaunchFailure('Error During File Verification', err.displayable || 'See console (CTRL + Shift + i) for more details.')
        return
    }


    if (invalidFileCount > 0) {
        loggerLaunchSuite.info('Downloading files.')
        setLaunchDetails('Downloading files..')
        setLaunchPercentage(0)
        try {
            await fullRepairModule.download(percent => {
                setDownloadPercentage(percent)
            })
            setDownloadPercentage(100)
        } catch (err) {
            loggerLaunchSuite.error('Error during file download.')
            showLaunchFailure('Error During File Download', err.displayable || 'See console (CTRL + Shift + i) for more details.')
            return
        }
    } else {
        loggerLaunchSuite.info('No invalid files, skipping download.')
    }

    // Remove download bar.
    remote.getCurrentWindow().setProgressBar(-1)

    fullRepairModule.destroyReceiver()

    setLaunchDetails('Preparing to launch..')

    const mojangIndexProcessor = new MojangIndexProcessor(
        ConfigManager.getCommonDirectory(),
        serv.rawServer.minecraftVersion)
    const distributionIndexProcessor = new DistributionIndexProcessor(
        ConfigManager.getCommonDirectory(),
        distro,
        serv.rawServer.id
    )

    const forgeData = await distributionIndexProcessor.loadForgeVersionJson(serv)
    const versionData = await mojangIndexProcessor.getVersionJson()

    if (login) {
        const authUser = ConfigManager.getSelectedAccount()
        loggerLaunchSuite.info(`Sending selected account (${authUser.displayName}) to ProcessBuilder.`)
        let pb = new ProcessBuilder(serv, versionData, forgeData, authUser, remote.app.getVersion())
        setLaunchDetails('Launching game..')

        // const SERVER_JOINED_REGEX = /\[.+\]: \[CHAT\] [a-zA-Z0-9_]{1,16} joined the game/
        const SERVER_JOINED_REGEX = new RegExp(`\\[.+\\]: \\[CHAT\\] ${authUser.displayName} joined the game`)

        const onLoadComplete = () => {
            toggleLaunchArea(false)
            if (hasRPC) {
                DiscordWrapper.updateDetails('Loading game..')
                proc.stdout.on('data', gameStateChange)
            }
            proc.stdout.removeListener('data', tempListener)
            proc.stderr.removeListener('data', gameErrorListener)
        }
        const start = Date.now()

        // Attach a temporary listener to the client output.
        // Will wait for a certain bit of text meaning that
        // the client application has started, and we can hide
        // the progress bar stuff.
        const tempListener = function (data) {
            if (GAME_LAUNCH_REGEX.test(data.trim())) {
                const diff = Date.now() - start
                if (diff < MIN_LINGER) {
                    setTimeout(onLoadComplete, MIN_LINGER - diff)
                } else {
                    onLoadComplete()
                }
            }
        }

        // Listener for Discord RPC.
        const gameStateChange = function (data) {
            data = data.trim()
            if (SERVER_JOINED_REGEX.test(data)) {
                DiscordWrapper.updateDetails('Exploring the Realm!')
            } else if (GAME_JOINED_REGEX.test(data)) {
                DiscordWrapper.updateDetails('Sailing to Westeros!')
            }
        }

        const gameErrorListener = function (data) {
            data = data.trim()
            if (data.indexOf('Could not find or load main class net.minecraft.launchwrapper.Launch') > -1) {
                loggerLaunchSuite.error('Game launch failed, LaunchWrapper was not downloaded properly.')
                showLaunchFailure('Error During Launch', 'The main file, LaunchWrapper, failed to download properly. As a result, the game cannot launch.<br><br>To fix this issue, temporarily turn off your antivirus software and launch the game again.<br><br>If you have time, please <a href="https://github.com/dscalzi/HeliosLauncher/issues">submit an issue</a> and let us know what antivirus software you use. We\'ll contact them and try to straighten things out.')
            }
        }

        try {
            // Build Minecraft process.
            proc = pb.build()

            // Bind listeners to stdout.
            proc.stdout.on('data', tempListener)
            proc.stderr.on('data', gameErrorListener)

            setLaunchDetails('Done. Enjoy the server!')

            // Init Discord Hook
            if (distro.rawDistribution.discord != null && serv.rawServerdiscord != null) {
                DiscordWrapper.initRPC(distro.rawDistribution.discord, serv.rawServer.discord)
                hasRPC = true
                proc.on('close', (code, signal) => {
                    loggerLaunchSuite.info('Shutting down Discord Rich Presence..')
                    DiscordWrapper.shutdownRPC()
                    hasRPC = false
                    proc = null
                })
            }

        } catch (err) {

            loggerLaunchSuite.error('Error during launch', err)
            showLaunchFailure('Error During Launch', 'Please check the console (CTRL + Shift + i) for more details.')

        }
    }

}

/**
 * News Loading Functions
 */

// DOM Cache
const newsContent = document.getElementById('newsContent')
const newsArticleTitle = document.getElementById('newsArticleTitle')
const newsArticleDate = document.getElementById('newsArticleDate')
const newsArticleAuthor = document.getElementById('newsArticleAuthor')
const newsArticleComments = document.getElementById('newsArticleComments')
const newsNavigationStatus = document.getElementById('newsNavigationStatus')
const newsArticleContentScrollable = document.getElementById('newsArticleContentScrollable')
const nELoadSpan = document.getElementById('nELoadSpan')

// News slide caches.
let newsActive = false
let newsGlideCount = 0

/**
 * Show the news UI via a slide animation.
 * 
 * @param {boolean} up True to slide up, otherwise false. 
 */
function slide_(up) {
    const lCUpper = document.querySelector('#landingContainer > #upper')
    const lCLLeft = document.querySelector('#landingContainer > #lower > #left')
    const lCLCenter = document.querySelector('#landingContainer > #lower > #center')
    const lCLRight = document.querySelector('#landingContainer > #lower > #right')
    const newsBtn = document.querySelector('#landingContainer > #lower > #center #content')
    const landingContainer = document.getElementById('landingContainer')
    const newsContainer = document.querySelector('#landingContainer > #newsContainer')

    newsGlideCount++

    if (up) {
        lCUpper.style.top = '-200vh'
        lCLLeft.style.top = '-200vh'
        lCLCenter.style.top = '-200vh'
        lCLRight.style.top = '-200vh'
        newsBtn.style.top = '130vh'
        newsContainer.style.top = '0px'
        //date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric'})
        //landingContainer.style.background = 'rgba(29, 29, 29, 0.55)'
        landingContainer.style.background = 'rgba(0, 0, 0, 0.50)'
        setTimeout(() => {
            if (newsGlideCount === 1) {
                lCLCenter.style.transition = 'none'
                newsBtn.style.transition = 'none'
            }
            newsGlideCount--
        }, 2000)
    } else {
        setTimeout(() => {
            newsGlideCount--
        }, 2000)
        landingContainer.style.background = null
        lCLCenter.style.transition = null
        newsBtn.style.transition = null
        newsContainer.style.top = '100%'
        lCUpper.style.top = '0px'
        lCLLeft.style.top = '0px'
        lCLCenter.style.top = '0px'
        lCLRight.style.top = '0px'
        newsBtn.style.top = '10px'
    }
}

// Bind news button.
document.getElementById('newsButton').onclick = () => {
    // Toggle tabbing.
    if (newsActive) {
        $('#landingContainer *').removeAttr('tabindex')
        $('#newsContainer *').attr('tabindex', '-1')
        $('#custom_render').hide()
    } else {
        $('#landingContainer *').attr('tabindex', '-1')
        $('#newsContainer, #newsContainer *, #lower, #lower #center *').removeAttr('tabindex')
        
        $('#custom_render').show()
        if (newsAlertShown) {
            $('#newsButtonAlert').fadeOut(2000)
            newsAlertShown = false
            ConfigManager.setNewsCacheDismissed(true)
            ConfigManager.save()
        }
    }
    slide_(!newsActive)
    newsActive = !newsActive
}

// Array to store article meta.
let newsArr = null

// News load animation listener.
let newsLoadingListener = null

/**
 * Set the news loading animation.
 * 
 * @param {boolean} val True to set loading animation, otherwise false.
 */
function setNewsLoading(val) {
    if (val) {
        const nLStr = 'Checking for News'
        let dotStr = '..'
        nELoadSpan.innerHTML = nLStr + dotStr
        newsLoadingListener = setInterval(() => {
            if (dotStr.length >= 3) {
                dotStr = ''
            } else {
                dotStr += '.'
            }
            nELoadSpan.innerHTML = nLStr + dotStr
        }, 750)
    } else {
        if (newsLoadingListener != null) {
            clearInterval(newsLoadingListener)
            newsLoadingListener = null
        }
    }
}

// Bind retry button.
newsErrorRetry.onclick = () => {
    $('#newsErrorFailed').fadeOut(250, () => {
        // initNews()
        $('#newsErrorLoading').fadeIn(250)
    })
}

newsArticleContentScrollable.onscroll = (e) => {
    if (e.target.scrollTop > Number.parseFloat($('.newsArticleSpacerTop').css('height'))) {
        newsContent.setAttribute('scrolled', '')
    } else {
        newsContent.removeAttribute('scrolled')
    }
}

/**
 * Reload the news without restarting.
 * 
 * @returns {Promise.<void>} A promise which resolves when the news
 * content has finished loading and transitioning.
 */
function reloadNews() {
    return new Promise((resolve, reject) => {
        $('#newsContent').fadeOut(250, () => {
            $('#newsErrorLoading').fadeIn(250)
            // initNews().then(() => {
            //     resolve()
            // })
        })
    })
}

let newsAlertShown = false

/**
 * Show the news alert indicating there is new news.
 */
function showNewsAlert() {
    newsAlertShown = true
    $(newsButtonAlert).fadeIn(250)
}

/**
 * Initialize News UI. This will load the news and prepare
 * the UI accordingly.
 * 
 * @returns {Promise.<void>} A promise which resolves when the news
 * content has finished loading and transitioning.
 */
function initNews() {

    return new Promise((resolve, reject) => {
        setNewsLoading(true)

        let news = {}
        loadNews().then(news => {

            newsArr = news?.articles || null

            if (newsArr == null) {
                // News Loading Failed
                setNewsLoading(false)

                $('#newsErrorLoading').fadeOut(250, () => {
                    $('#newsErrorFailed').fadeIn(250, () => {
                        resolve()
                    })
                })
            } else if (newsArr.length === 0) {
                // No News Articles
                setNewsLoading(false)

                ConfigManager.setNewsCache({
                    date: null,
                    content: null,
                    dismissed: false
                })
                ConfigManager.save()

                $('#newsErrorLoading').fadeOut(250, () => {
                    $('#newsErrorNone').fadeIn(250, () => {
                        resolve()
                    })
                })
            } else {
                // Success
                setNewsLoading(false)

                const lN = newsArr[0]
                const cached = ConfigManager.getNewsCache()
                let newHash = crypto.createHash('sha1').update(lN.content).digest('hex')
                let newDate = new Date(lN.date)
                let isNew = false

                if (cached.date != null && cached.content != null) {

                    if (new Date(cached.date) >= newDate) {

                        // Compare Content
                        if (cached.content !== newHash) {
                            isNew = true
                            showNewsAlert()
                        } else {
                            if (!cached.dismissed) {
                                isNew = true
                                showNewsAlert()
                            }
                        }

                    } else {
                        isNew = true
                        showNewsAlert()
                    }

                } else {
                    isNew = true
                    showNewsAlert()
                }

                if (isNew) {
                    ConfigManager.setNewsCache({
                        date: newDate.getTime(),
                        content: newHash,
                        dismissed: false
                    })
                    ConfigManager.save()
                }

                const switchHandler = (forward) => {
                    let cArt = parseInt(newsContent.getAttribute('article'))
                    let nxtArt = forward ? (cArt >= newsArr.length - 1 ? 0 : cArt + 1) : (cArt <= 0 ? newsArr.length - 1 : cArt - 1)

                    displayArticle(newsArr[nxtArt], nxtArt + 1)
                }

                document.getElementById('newsNavigateRight').onclick = () => { switchHandler(true) }
                document.getElementById('newsNavigateLeft').onclick = () => { switchHandler(false) }

                $('#newsErrorContainer').fadeOut(250, () => {
                    displayArticle(newsArr[0], 1)
                    $('#newsContent').fadeIn(250, () => {
                        resolve()
                    })
                })
            }

        })

    })
}

/**
 * Add keyboard controls to the news UI. Left and right arrows toggle
 * between articles. If you are on the landing page, the up arrow will
 * open the news UI.
 */
// document.addEventListener('keydown', (e) => {
//     if (newsActive) {
//         if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
//             document.getElementById(e.key === 'ArrowRight' ? 'newsNavigateRight' : 'newsNavigateLeft').click()
//         }
//         // Interferes with scrolling an article using the down arrow.
//         // Not sure of a straight forward solution at this point.
//         // if(e.key === 'ArrowDown'){
//         //     document.getElementById('newsButton').click()
//         // }
//     } else {
//         if (getCurrentView() === VIEWS.landing) {
//             if (e.key === 'ArrowUp') {
//                 document.getElementById('newsButton').click()
//             }
//         }
//     }
// })

/**
 * Display a news article on the UI.
 * 
 * @param {Object} articleObject The article meta object.
 * @param {number} index The article index.
 */
function displayArticle(articleObject, index) {
    newsArticleTitle.innerHTML = articleObject.title
    newsArticleTitle.href = articleObject.link
    newsArticleAuthor.innerHTML = 'by ' + articleObject.author
    newsArticleDate.innerHTML = articleObject.date
    newsArticleComments.innerHTML = articleObject.comments
    newsArticleComments.href = articleObject.commentsLink
    newsArticleContentScrollable.innerHTML = '<div id="newsArticleContentWrapper"><div class="newsArticleSpacerTop"></div>' + articleObject.content + '<div class="newsArticleSpacerBot"></div></div>'
    Array.from(newsArticleContentScrollable.getElementsByClassName('bbCodeSpoilerButton')).forEach(v => {
        v.onclick = () => {
            const text = v.parentElement.getElementsByClassName('bbCodeSpoilerText')[0]
            text.style.display = text.style.display === 'block' ? 'none' : 'block'
        }
    })
    newsNavigationStatus.innerHTML = index + ' of ' + newsArr.length
    newsContent.setAttribute('article', index - 1)
}

/**
 * Load news information from the RSS feed specified in the
 * distribution index.
 */
async function loadNews() {

    const distroData = await DistroAPI.getDistribution()
    if (!distroData.rawDistribution.rss) {
        loggerLanding.debug('No RSS feed provided.')
        return null
    }

    const promise = new Promise((resolve, reject) => {

        const newsFeed = distroData.rawDistribution.rss
        const newsHost = new URL(newsFeed).origin + '/'
        $.ajax({
            url: newsFeed,
            success: (data) => {
                const items = $(data).find('item')
                const articles = []

                for (let i = 0; i < items.length; i++) {
                    // JQuery Element
                    const el = $(items[i])

                    // Resolve date.
                    const date = new Date(el.find('pubDate').text()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' })

                    // Resolve comments.
                    let comments = el.find('slash\\:comments').text() || '0'
                    comments = comments + ' Comment' + (comments === '1' ? '' : 's')

                    // Fix relative links in content.
                    let content = el.find('content\\:encoded').text()
                    let regex = /src="(?!http:\/\/|https:\/\/)(.+?)"/g
                    let matches
                    while ((matches = regex.exec(content))) {
                        content = content.replace(`"${matches[1]}"`, `"${newsHost + matches[1]}"`)
                    }

                    let link = el.find('link').text()
                    let title = el.find('title').text()
                    let author = el.find('dc\\:creator').text()

                    // Generate article.
                    articles.push(
                        {
                            link,
                            title,
                            date,
                            author,
                            content,
                            comments,
                            commentsLink: link + '#comments'
                        }
                    )
                }
                resolve({
                    articles
                })
            },
            timeout: 2500
        }).catch(err => {
            resolve({
                articles: null
            })
        })
    })

    return await promise
}
