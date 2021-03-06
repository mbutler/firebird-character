import * as Utils from './utils'
import * as User from './user'
import * as pf from 'phoenix-functions'
import * as Database from './database'

export function setUser(user) {
    $('.arc-rows').hide()
    $(`#shot-type-button .dropdown-toggle`).empty().append('Single Shot')
    $('#uid').val(user.uid)
   
    let weapons = pf.getAllWeapons()
    $('#weapon-button .col .dropdown-menu').empty()
    _.forEach(weapons, gun => {
        $('#weapon-button .col .dropdown-menu').append(`<span class="dropdown-item dropdown-eal">${gun.Name}</span>`)
    })
        
    let snap = Database.currentGame(user.uid)
    snap.then(game => {
        $('.game-title').text(game.metadata.title)
        let userCharacters = User.getUserCharacters(game)
        _.forEach(userCharacters, player => {
            if (user.uid === player.userId) {
                $('#calc-character-name .dropdown-menu').append(`<span class="dropdown-item dropdown-eal">${player.characterName}</span>`)                    
            }
        })
    })    
}

export function eal() {
    if ($('#range').val() === '' || $('#aim-time').val() === '' || $(`#weapon-button .dropdown-toggle`).html() === 'Weapon') {
        Utils.modal("Phoenix Command", "Weapon, Range, and Aim Time are required values.")
    } else {
        let snap = Database.currentCharacter()
        snap.then(character => {
            let eal = {}
            let sal = _.toNumber($('#calc-sal').val())
            let range = _.toNumber($('#range').val())
            let targetSpeed = _.toNumber($('#target-speed').val())
            let shooterSpeed = _.toNumber($('#shooter-speed').val())
            let aimTime = _.toNumber($('#aim-time').val()) - 1 //decrement to access zero-based array
            $('#from-the-hip').prop('checked', false)
            if (shooterSpeed > 0) {$('#from-the-hip').prop('checked', true)}
            let weaponName = $(`#weapon-button .dropdown-toggle`).html()
            let gun = pf.getWeaponByName(weaponName)
            let ammoType = character['ammo'][weaponName]['type']   
            let weaponAim = _.values(gun['Aim Time'])
            let weaponAimIndex = _.clamp(aimTime, 0, weaponAim.length - 1)
            let shotType = $('#shot-type-button .dropdown-toggle').html()        
            let firingStance = $('#firing-stance-button .dropdown-toggle').html()
            if (firingStance === false) {$('#from-the-hip').prop('checked', true)}
            let position = $('#position-button .dropdown-toggle').html()
            let situational = Utils.selectedCheckboxes($('[name="situational"]'))
            let visibility = Utils.selectedCheckboxes($('[name="visibility"]'))
            let targetSize = Utils.selectedCheckboxes($('[name="targetsize"]'))
            let targetDiameter = _.toNumber($('#target-size').val())
            eal.sal = sal, eal.shotType = shotType, eal.targetSpeed = targetSpeed, eal.shooterSpeed = shooterSpeed, eal.range = range, eal.aimTime = aimTime
            eal.firingStance = firingStance, eal.position = position, eal.situational = situational, eal.visibility = visibility, eal.targetSize = targetSize
            eal.weaponAimMod = weaponAim[_.toString(weaponAimIndex)], eal.targetDiameter = targetDiameter, eal.sab = 0, eal.ammoType = ammoType, eal.salm = 0
            $('#fire-button').off('click')
            $('#sab').val('false')
            displayChanceToHit(gun, eal)            
        }) 
    }       
}

function displayChanceToHit(weapon, eal) {
    let shotType = eal.shotType
    let accuracy = pf.effectiveAccuracyLevel(eal)
    let chance = pf.oddsOfHitting(accuracy, shotType)
    $('.arc-rows').hide()
    $('#odds-of-hitting').empty()
    $('#eal').empty().append(accuracy)
    
    if (shotType === 'Burst') {
        burstHandler(weapon, eal, accuracy, chance)
    } 
    
    if (shotType === 'Single Shot') {
        singleShotHandler(weapon, eal, accuracy, chance)
    }
    
    if (shotType === 'Shotgun') {
        shotgunHandler(weapon, eal, accuracy, chance)
    }

    if (shotType === 'Explosive') {
        explosiveHandler(weapon, eal, accuracy, chance)
    }

    $('.nav-tabs a[href="#odds"]').tab('show')    
}

function burstHandler(weapon, eal, accuracy, chance) {
    $('.arc-rows h5').empty().append(`Number of Targets in <strong>Minimum Arc of ${getMinimumArc(weapon, eal.range)}:</strong>`)
    $('.arc-rows').show()
    $('#odds-label').empty().append(`<strong><h3>Burst Elevation Chance</h3></strong>`)        
    $('#odds-of-hitting').empty().append(`<h3>${chance}%</h3>`)        
    $('#fire-button').click(e => {
        e.preventDefault()
        eal.sab = weapon['SAB']
        accuracy = pf.effectiveAccuracyLevel(eal)
        chance = pf.oddsOfHitting(accuracy, eal.shotType)
        $('#odds-of-hitting').empty().append(`<h3>${chance}%</h3>`)
        $('#sab-message').empty().append('<strong>Sustained Auto Burst Penalty</strong>')
        $('#sab').empty().append(`-${weapon['SAB']}`)
        let targets = _.toNumber($('#number-of-targets').val())
        let arc = _.toNumber($('#arc').val())            
        if (targets > 0 && arc > 0) {
            fireBurst(weapon, targets, arc, chance)                
        } else {
            Utils.modal("Phoenix Command", 'Arc and number of targets required.')
        }     
    })    
}

function singleShotHandler(weapon, eal, accuracy, chance) {
    $('#odds-label').empty().append(`<strong><h3>Chance of Hitting</h3></strong>`)
    $('#odds-of-hitting').empty().append(`<h3>${chance}%</h3>`)
    $('#fire-button').click(e => {
        e.preventDefault()
        eal.sab = weapon['SAB']
        accuracy = pf.effectiveAccuracyLevel(eal)
        chance = pf.oddsOfHitting(accuracy, eal.shotType)
        $('#odds-of-hitting').empty().append(`<h3>${chance}%</h3>`)
        $('#sab-message').empty().append('<strong>Sustained Auto Burst Penalty</strong>')
        $('#sab').empty().append(`-${weapon['SAB']}`)
        fireSingleShot(weapon, chance)
    }) 
}

function shotgunHandler(weapon, eal, accuracy, chance) {
    let range = pf.snapToValue(eal.range, [1,2,4,6,8,10,15,20,30,40,80])
    let salm = 0
    if (eal.ammoType === 'Shot') {
        salm = weapon[range]['Shot']['SALM']
        eal.salm = salm
    }
    accuracy = pf.effectiveAccuracyLevel(eal)
    accuracy = accuracy + salm
    chance = pf.oddsOfHitting(accuracy, eal.shotType)
    $('#odds-label').empty().append(`<strong><h3>Pattern Hit Chance</h3></strong>`)
    $('#odds-of-hitting').empty().append(`<h3>${chance}%</h3>`)        
    $('#fire-button').click(e => {
        e.preventDefault()
        eal.sab = weapon['SAB']       
        accuracy = pf.effectiveAccuracyLevel(eal)
        accuracy = accuracy + salm
        chance = pf.oddsOfHitting(accuracy, eal.shotType)
        $('#eal').empty().append(accuracy)
        $('#odds-of-hitting').empty().append(`<h3>${chance}%</h3>`)
        $('#sab-message').empty().append('<strong>Sustained Auto Burst Penalty</strong>')
        $('#sab').empty().append(`-${weapon['SAB']}`)
        fireShotgun(eal.ammoType, range, weapon, chance)
    })     
}

function explosiveHandler(weapon, eal, accuracy, chance) {
    if (eal.range > weapon.MR) { chance = 0 }
    $('#odds-label').empty().append(`<strong><h3>Chance of Hitting</h3></strong>`)
    $('#odds-of-hitting').empty().append(`<h3>${chance}%</h3>`)
    $('#fire-button').click(e => {
        e.preventDefault()
        eal.sab = weapon['SAB']
        accuracy = pf.effectiveAccuracyLevel(eal)
        chance = pf.oddsOfHitting(accuracy, eal.shotType)
        if (eal.range > weapon.MR) { chance = 0 }
        $('#odds-of-hitting').empty().append(`<h3>${chance}%</h3>`)
        $('#sab-message').empty().append('<strong>Sustained Auto Burst Penalty</strong>')
        $('#sab').empty().append(`-${weapon['SAB']}`)
        fireExplosive(weapon, eal.range, chance, accuracy)
    })
}

function fireBurst(weapon, numberOfTargets, arc, chance) {
    let result = ''
    let rof = weapon['ROF']
    let roll = _.random(0,99)
    let path = window.localStorage.getItem('firebird-command-current-character')
    let snap = Database.currentCharacter()
    snap.then(character => {
        let loadedAmmo = character['ammo'][weapon.Name]['loaded']
        let ammoType = character['ammo'][weapon.Name]['type']
        let loadedAmmoPath = path + '/ammo/' + weapon.Name + '/loaded/'
        if (loadedAmmo >= rof) {
            Database.set(loadedAmmoPath, loadedAmmo - rof)
            console.log(`roll: ${roll}, chance: ${chance}`)
            if (roll <= chance) {
                result = pf.burstFire(arc, rof, numberOfTargets)
                console.log(`burst fire result: ${JSON.stringify(result)}`)
                displayTargets(result, weapon, ammoType)
            } else {
                result = 'Burst fire at wrong elevation. All targets missed.'
                Utils.modal("Phoenix Command", result)
            }
        } else {
            result = 'Not enough ammo loaded for burst mode.'
            Utils.modal("Phoenix Command", result)
        }
    })    
}

function fireSingleShot(weapon, chance) {
    let result = ''
    let path = window.localStorage.getItem('firebird-command-current-character')
    let snap = Database.currentCharacter()
    snap.then(character => {
        let loadedAmmo = character['ammo'][weapon.Name]['loaded']
        let ammoType = character['ammo'][weapon.Name]['type']
        let loadedAmmoPath = path + '/ammo/' + weapon.Name + '/loaded/'
        if (loadedAmmo >= 1) {
            Database.set(loadedAmmoPath, loadedAmmo - 1)
            result = pf.singleShotFire(chance)
            displayTargets(result, weapon, ammoType)
        } else {
            result = 'Out of ammo.'
            Utils.modal("Phoenix Command", result)
        }
    })
}

function fireShotgun(ammoType, range, weapon, chance) {
    let result = ''
    let bphc
    let rof = weapon['ROF']
    if (ammoType === 'Shot') {
        bphc = weapon[range][ammoType]['BPHC']
    }
    let roll = _.random(0,99)
    let path = window.localStorage.getItem('firebird-command-current-character')
    let snap = Database.currentCharacter()
    snap.then(character => {
        let loadedAmmo = character['ammo'][weapon.Name]['loaded']
        let ammoType = character['ammo'][weapon.Name]['type']
        let loadedAmmoPath = path + '/ammo/' + weapon.Name + '/loaded/'
        if (loadedAmmo >= 1) {
            Database.set(loadedAmmoPath, loadedAmmo - 1)
            if (roll <= chance) {
                result = pf.shotgunFire(ammoType, range, bphc)
                displayTargets(result, weapon, ammoType)
            } else {
                result = 'Shotgun blast missed.'
                Utils.modal("Phoenix Command", result)
            }            
        } else {
            result = 'Out of ammo.'
            Utils.modal("Phoenix Command", result)
        }
    })
}

function fireExplosive(weapon, ammoType, chance, accuracy) {
    let result = ''
    let path = window.localStorage.getItem('firebird-command-current-character')
    let snap = Database.currentCharacter()
    let roll = _.random(0,99)
    let location = 'Explosive shot hit on target.'
    snap.then(character => {
        let loadedAmmo = character['ammo'][weapon.Name]['loaded']
        let ammoType = character['ammo'][weapon.Name]['type']
        let loadedAmmoPath = path + '/ammo/' + weapon.Name + '/loaded/'
        if (loadedAmmo >= 1) {
            Database.set(loadedAmmoPath, loadedAmmo - 1)
            if (roll <= chance) {
                result = pf.explosiveFire(weapon, ammoType)
                displayExplosionTargets(result, weapon, ammoType, location)
            } else {
                let requiredEAL = pf.ealToHit(roll, 'Single Shot')
                let scatter = pf.shotScatter(accuracy, requiredEAL)
                let placement = pf.missedShotPlacement(_.random(0,9), scatter)
                let h = 'hexes'
                if (scatter === 1) {h = 'hex'}
                location = `Explosive shot hit ${scatter} ${h} ${placement}`
                result = pf.explosiveFire(weapon, ammoType)
                displayExplosionTargets(result, weapon, ammoType, location)
            }            
        } else {
            result = 'Out of ammo.'
            Utils.modal("Phoenix Command", result)
        }
    })
}

function getMinimumArc(weapon, range) {
    range = pf.snapToValue(range, [10,20,40,70,100,200,300,400])
    let arc = weapon[_.toString(range)]['MA']
    return arc
}

function displayTargets(targetList, weapon, ammoType) {
    let bullets = 0
    let targetRows = ''
    let targets = targetList
    //const targets = {"target 1":{"hit":false,"bullets":6,"chance":23},"target 2":{"hit":false,"bullets":0,"chance":23},"target 3":{"hit":false,"bullets":0,"chance":23},"target 4":{"hit":false,"bullets":0,"chance":23},"target 5":{"hit":false,"bullets":0,"chance":23},"target 6":{"hit":false,"bullets":0,"chance":23},"target 7":{"hit":false,"bullets":0,"chance":23},"target 8":{"hit":false,"bullets":0,"chance":23},"target 9":{"hit":false,"bullets":0,"chance":23},"target 10":{"hit":false,"bullets":2,"chance":23}}
    for (let i = 1; i <= _.size(targets); i++) {
        //add the cumulative hits to the latest hits
        bullets = _.toNumber($(`#target-${i}-bullets`).text()) + _.toNumber(`${targets[`target ${i}`]['bullets']}`)        
        let tr = `
            <tr>
                <td class="text-center">${i}</td>
                <td id="target-${i}-bullets" class="text-center">${bullets}</td>
                <td id="target-${i}-cover" class="text-center"><select id="target-${i}-cover" class="form-control selectpicker target-armor-select" data-style="btn btn-link"">
                <option value="True">True</option>
                <option value="False">False</option>
            </select></td>
                <td class="text-center"><select id="target-${i}-armor" class="form-control selectpicker target-armor-select" data-style="btn btn-link"">
                    <option value="Clothing">Clothing</option>
                    <option value="Light Flexible">Light Flexible</option>
                    <option value="Medium Flexible">Medium Flexible</option>
                    <option value="Heavy Flexible">Heavy Flexible</option>
                    <option value="Light Rigid">Light Rigid</option>
                    <option value="Medium Rigid">Medium Rigid</option>
                    <option value="Heavy Rigid">Heavy Rigid</option>
                </select></td>
            </tr>
        `
        targetRows += tr
    }
    let div = `<table id="target-table" class="table table-condensed table-bordered table-striped">
        <thead>
            <tr>
                <th class="text-center">Target</th>
                <th class="text-center">Hits</th>
                <th class="text-center">Cover</th>
                <th class="text-center">Armor</th>
            </tr>
        </thead>
        <tbody>${targetRows}</tbody>
    </table>`
    $('#hits').empty().append(div)
    $('#hits').append('<button id="damage-button" class="btn btn-primary btn-sm">Calculate Damage</button>')
    $('#damage-button').click(e => {
        e.preventDefault()
        let result = {}
        for (let i = 1; i <= _.size(targets); i++) {
            let armor = 'Clothing'
            let hits = _.toNumber($(`#target-${i}-bullets`).text())
            armor = $(`#target-${i}-armor`).find(":selected").text()
            let cover = $(`#target-${i}-cover`).find(":selected").text()
            result[`target ${i}`] = {"hits": hits, "cover": cover, "armor": armor}
        }
        calculateDamage(result, weapon, ammoType)
    })
    $('.nav-tabs a[href="#hits"]').tab('show')
}

function displayExplosionTargets(targetList, weapon, ammoType, location) {
    let bullets = 0
    let radius = ['0','1','2','3','5','10']
    let targetRows = ''
    _.forEach(radius, val => {
        bullets = _.toNumber(`${targetList[`${val}`]['bullets']}`)
        let tr = `<tr>
            <td class="text-center">${val}</td>
            <td id="target-${val}-bullets" class="text-center">${bullets}</td>
        </select></td>
            <td class="text-center"><select id="target-${val}-armor" class="form-control selectpicker target-armor-select" data-style="btn btn-link"">
                <option value="Clothing">Clothing</option>
                <option value="Light Flexible">Light Flexible</option>
                <option value="Medium Flexible">Medium Flexible</option>
                <option value="Heavy Flexible">Heavy Flexible</option>
                <option value="Light Rigid">Light Rigid</option>
                <option value="Medium Rigid">Medium Rigid</option>
                <option value="Heavy Rigid">Heavy Rigid</option>
            </select></td>
            <td class="text-center"><select id="target-${val}-blast-mod" class="form-control selectpicker target-blast-mod-select" data-style="btn btn-link"">
                <option value="In the Open">In the Open</option>    
                <option value="Underwater">Underwater</option>
                <option value="In Small Room (10')">In Small Room (10')</option>
                <option value="In Open Trench">In Open Trench</option>
                <option value="Prone">Prone</option>
                <option value="Under Partial Cover">Under Partial Cover</option>
                <option value="In Combat Suit">In Combat Suit</option>
                <option value="In Power Armor">In Power Armor</option>
                <option value="Behind Solid Cover">Behind Solid Cover</option>
            </select></td>
        </tr>`
        targetRows += tr
    })    
    let div = `<table id="target-table" class="table table-condensed table-bordered table-striped">
        <thead>
            <tr>
                <th class="text-center">Hexes Away</th>
                <th class="text-center">Hits</th>
                <th class="text-center">Armor</th>
                <th class="text-center">Blast Mod</th>
            </tr>
        </thead>
        <tbody>${targetRows}</tbody>
    </table>`
    $('#hits').empty().append(`<h5><strong>${location}</strong></h5>`)
    $('#hits').append(div)
    $('#hits').append('<button id="damage-button" class="btn btn-primary btn-sm">Calculate Damage</button>')
    $('#damage-button').click(e => {
        e.preventDefault()
        let result = {}
        let radius = ['0','1','2','3','5','10']
        _.forEach(radius, val => {
            let armor = 'Clothing'
            let hits = _.toNumber($(`#target-${val}-bullets`).text())
            armor = $(`#target-${val}-armor`).find(":selected").text()
            let cover = $(`#target-${val}-cover`).find(":selected").text()
            let blastMod = $(`#target-${val}-blast-mod`).find(":selected").text()
            result[`radius ${val}`] = {"hits": hits, "cover": cover, "armor": armor, "blastMod": blastMod}
        })
        calculateExplosionDamage(result, weapon, ammoType)
    })
    $('.nav-tabs a[href="#hits"]').tab('show')
}

function calculateDamage(targets, weapon, ammoType) {
    let rangeVal = _.toNumber($('#range').val())
    let range = pf.snapToValue(rangeVal, [10,20,40,70,100,200,300,400])
    if (weapon.Type === 'Shotgun') {range = pf.snapToValue(rangeVal, [1,2,4,6,8,10,15,20,30,40,80])}
    if (weapon.Type === 'Explosive') {range = pf.snapToValue(rangeVal, [0,1,2,3,5,10])}
    let pen = weapon[range][ammoType]['PEN']
    let dc = weapon[range][ammoType]['DC']
    let result = {}
    for (let i = 1; i <= _.size(targets); i++) {
        let damage = 0
        let shots = []
        let armor = targets[`target ${i}`]['armor']
        let hits = targets[`target ${i}`]['hits']
        let cover = targets[`target ${i}`]['cover']
        let hitRoll
        cover = cover.toLowerCase() == 'true' ? true : false
        for (let j = 1; j <= hits; j++) {
            //0-9 roll for epf
            let epfRoll = _.random(0,9)
            console.log(`epf roll: ${epfRoll}`)
            if (j > 1 && ammoType === 'Shot') {
                let salm = weapon[range]['Shot']['SALM']
                hitRoll = hitRoll + pf.shotgunMultipleHit(salm)
                hitRoll = _.clamp(hitRoll, 0, 99)
            } else {
                hitRoll = _.random(0,99)
                console.log(`hit roll: ${hitRoll}`)
            }
            let epf = pf.effectivePenetrationFactor(epfRoll, armor)
            let hitDamage = pf.hitDamage(hitRoll, cover, dc, pen, epf)
            let hitLocation = pf.hitLocation(hitRoll, cover)
            damage += hitDamage
            console.log(`range: ${range}, hitDamage: ${hitDamage}, damage: ${damage}, epf: ${epf}, dc: ${dc}`)
            shots.push(hitLocation)
        }        
        result[`target ${i}`] = {"hit location": shots, "hit damage": damage}
    }    
    displayDamage(result)
    $('.nav-tabs a[href="#damage"]').tab('show')
}

function calculateExplosionDamage(targets, weapon, ammoType) {
    let result = {}
    let radius = ['0','1','2','3','5','10']
    _.forEach(radius, val => {
        let cover = false
        let hitLocation = ''
        let damage = 0
        let shots = []
        let armor = targets[`radius ${val}`]['armor']
        let hits = targets[`radius ${val}`]['hits']
        let blastMod = targets[`radius ${val}`]['blastMod']
        if (blastMod === 'Behind Solid Cover' || blastMod === 'Under Partial Cover') {
            cover = true
        }
        let bm = pf.blastModifier(blastMod)
        let bc = weapon[val][ammoType]['BC']
        let concussionDamage = bm * bc
        let pen = weapon[val][ammoType]['PEN']
        let dc = weapon[val][ammoType]['DC']
        let hitRoll
        //0-9 roll for epf
        let epfRoll = _.random(0,9)            
        hitRoll = _.random(0,99)
        let epf = pf.effectivePenetrationFactor(epfRoll, armor)
        let hitDamage = pf.hitDamage(hitRoll, cover, dc, pen, epf)
        damage = (hits * hitDamage) + concussionDamage
        if (damage > 0) {hitLocation = pf.hitLocation(hitRoll, cover)}
        shots.push(hitLocation)     
        result[`radius ${val}`] = {"hit location": shots, "hit damage": damage}
    })
    displayExplosionDamage(result)
    $('.nav-tabs a[href="#damage"]').tab('show')
}

function displayDamage(targets) {
    let targetRows = ''
    for (let i = 1; i <= _.size(targets); i++) {
        let damage = targets[`target ${i}`]['hit damage']
        let location = targets[`target ${i}`]['hit location']
        location = _.uniq(location)
        let tr = `
        <tr>
            <td class="text-center">${i}</td>
            <td id="target-${i}-location" class="text-center">${location}</td>
            <td id="target-${i}-damage" class="text-center">${damage}</td>
            <td class="text-center"><select id="target-${i}-aid" class="form-control selectpicker target-aid-select" data-style="btn btn-link"">
                <option value="No Aid">No Aid</option>
                <option value="First Aid">First Aid</option>
                <option value="Aid Station">Aid Station</option>
                <option value="Field Hospital">Field Hospital</option>
                <option value="Trauma Center">Trauma Center</option>
            </select></td>
            <td id="target-${i}-recovery" class="text-center">${pf.medicalAid(_.toNumber(damage), 'No Aid')}</td>
        </tr>
    `
    targetRows += tr
    }
    let div = `<table id="damage-table" class="table table-condensed table-bordered table-striped">
        <thead>
            <tr>
                <th class="text-center">Target</th>
                <th class="text-center">Location</th>
                <th class="text-center">Damage</th>
                <th class="text-center">Aid</th>
                <th class="text-center">Recovery</th>
            </tr>
        </thead>
        <tbody>${targetRows}</tbody>
    </table>`
    $('#damage').empty().append(div)
    $('.target-aid-select').change((e) => {
        let id = _.split(e.target.id, '-', 2)
        let aid = e.target.value
        let damage = $(`#target-${id[1]}-damage`).text()
        let result = pf.medicalAid(_.toNumber(damage), aid)
        let recoveryId = `target-${id[1]}-recovery`
        $(`#${recoveryId}`).empty().append(result)
     })
}

function displayExplosionDamage(targets) {
    let targetRows = ''
    let radius = ['0','1','2','3','5','10']
    _.forEach(radius, val => {
        let damage = targets[`radius ${val}`]['hit damage']
        let location = targets[`radius ${val}`]['hit location']
        location = _.uniq(location)
        let tr = `
        <tr>
            <td class="text-center">${val}</td>
            <td id="target-${val}-location" class="text-center">${location}</td>
            <td id="target-${val}-damage" class="text-center">${damage}</td>
            <td class="text-center"><select id="target-${val}-aid" class="form-control selectpicker target-aid-select" data-style="btn btn-link"">
                <option value="No Aid">No Aid</option>
                <option value="First Aid">First Aid</option>
                <option value="Aid Station">Aid Station</option>
                <option value="Field Hospital">Field Hospital</option>
                <option value="Trauma Center">Trauma Center</option>
            </select></td>
            <td id="target-${val}-recovery" class="text-center">${pf.medicalAid(_.toNumber(damage), 'No Aid')}</td>
        </tr>
    `
    targetRows += tr
    })
    let div = `<table id="damage-table" class="table table-condensed table-bordered table-striped">
        <thead>
            <tr>
                <th class="text-center">Target</th>
                <th class="text-center">Location</th>
                <th class="text-center">Damage</th>
                <th class="text-center">Aid</th>
                <th class="text-center">Recovery</th>
            </tr>
        </thead>
        <tbody>${targetRows}</tbody>
    </table>`
    $('#damage').empty().append(div)
    $('.target-aid-select').change((e) => {
        let id = _.split(e.target.id, '-', 2)
        let aid = e.target.value
        let damage = $(`#target-${id[1]}-damage`).text()
        let result = pf.medicalAid(_.toNumber(damage), aid)
        let recoveryId = `target-${id[1]}-recovery`
        $(`#${recoveryId}`).empty().append(result)
     })
}




