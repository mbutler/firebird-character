import * as User from './user'
import * as Utils from './utils'
import * as Game from './game'
import * as Database from './database'
import * as pf from 'phoenix-functions'

export function displayCharacterSheet(characterName) {
  let snap = Database.currentGame()
  snap.then(game => {
    let characterId = User.getCharacterId(game, characterName)
    window.localStorage.setItem('firebird-command-current-character', 'users/' + game.metadata.gameId + '/content/characters/' + characterId)
    $('.game-title').text(game.metadata.title)        
    let character = User.getCharacterSheet(game, characterName)
    $('#character-name').empty().append(`<h3><strong>${character.characterName}</strong></h3>`)
    $('#skill-level').empty().append(`<h6>Level: ${character.skillLevel}</h6>`)
    $('#strength').empty().append(character.strength)
    $('#intelligence').empty().append(character.intelligence)
    $('#agility').empty().append(character.agility)
    $('#will').empty().append(character.will)
    $('#health').empty().append(character.health)
    $('#movement').empty().append(character.speed)
    $('#sal').empty().append(character.sal)
    $('#physical-damage').val(character.pd)
    $('#total-damage').empty().append(character.dt)
    $('#status').empty().append(character.status)
    $("#cover").val(character.cover).find(`option[value="${character.cover}"]`).attr('selected', true)
    $("#position").val(character.position).find(`option[value="${character.position}"]`).attr('selected', true)
    $('#impulse1').empty().append(character.capi['1'])
    $('#impulse2').empty().append(character.capi['2'])
    $('#impulse3').empty().append(character.capi['3'])
    $('#impulse4').empty().append(character.capi['4'])
    $('#knockout-value').empty().append(character.kv)
    $('#disabling-injuries').attr('data-content', character.injuries)
    $("#stance").val(character.stance).find(`option[value="${character.stance}"]`).attr('selected', true)
    displayWeapons(character)
    $('.sheet-picker').change(e => {
      let id = e.target.id
      let val = e.target.value
      let path = `users/${game.metadata.gameId}/content/characters/${characterId}/${id}`
      Database.set(path, val)
    })
    $('#physical-damage').change(e => {
      let pd = _.toNumber(e.target.value)
      let dt = pf.damageTotal(pd, character.health)
      let pdPath = `users/${game.metadata.gameId}/content/characters/${characterId}/pd`
      let dtPath = `users/${game.metadata.gameId}/content/characters/${characterId}/dt`
      Database.set(pdPath, pd)
      Database.set(dtPath, dt)
      $('#total-damage').empty().append(dt)
      let chance = pf.incapacitationChance(pd, character.kv)
      if (_.random(0,99) <= chance) {
        let roll = _.random(0,9)
        let time = pf.incapacitationTime(roll, pd)
        $('#status').empty().append('Incapacitated')
        let statusPath = `users/${game.metadata.gameId}/content/characters/${characterId}/status`
        Database.set(statusPath, 'Incapacitated')
        Utils.modal("Phoenix Command", `${characterName} incapacitated for ${time}`)
      }
    })
  })
}

export function displayCharacterCreation() {
  let snap = Database.currentGame()
  snap.then(game => {
    $('.game-title').empty().append(`<a href='game.html'>${game.metadata.title}</a>`)
  })  
    let weapons = pf.getAllWeapons()
    let weaponKeys = _.keys(weapons)
    _.forEach(weaponKeys, gun => {
      $('#weapon-checkboxes').append(`
      <div class="form-check form-check-inline">
          <label class="form-check-label">
              <input class="form-check-input" name="weapon" type="checkbox" id="${_.kebabCase(gun)}" value="${gun}">${gun}
              <span class="form-check-sign">
                <span class="check"></span>
              </span>
          </label>
      </div>`)
    })
  
}

export function displayWeapons(character) {  
    let databaseWeapons = pf.getAllWeapons()
    _.forEach(character.weapons, weapon => {
      let gun = _.find(databaseWeapons, o => {return o.Name === weapon})
      let ammoDropdown = _.kebabCase(gun.Name)
      let ammoTypes = pf.getAmmoTypes(gun.Name)
      let ammoDiv = `<select dir="rtl" id="${ammoDropdown}" class="form-control selectpicker ammo-picker" data-style="btn btn-link">`
      let ammo = character['ammo'][gun.Name]['type']
      let rounds = character['ammo'][gun.Name]['loaded']
      let aimTime = ''
      let optionName
      let optionValue
      if (gun.Type === 'Explosive') {
        optionName = 'Maximum Range'
        optionValue = gun.MR
      } else {
        optionName = 'Knockdown'
        optionValue = gun.KD
      }
      _.forEach(ammoTypes, ammoType => {ammoDiv += `<option value="${ammoType}">${ammoType}</option>`})
      ammoDiv += '</select>'
      let gunKeys = _.keys(gun['Aim Time'])
      _.forEach(gunKeys, aim => {

        let tr = `
            <tr>
                <td class="text-center">${aim}</td>
                <td id="aim-time-mod-${aim}" class="text-center">${gun['Aim Time'][aim]}</td>
                <td id="shot-accuracy-${aim}" class="text-center">${gun['Aim Time'][aim] + character.sal}</td>
            </tr>
        `
          aimTime += tr
      })

      let div = `<div class="row">
        <div id="weapon-name"class="col-xs-8"><h4><strong>${gun.Name}</strong></h4></div>
          </div>
          <div class="row weapon-image"><image src="${gun.Image}"></div>
          <div class="row color-row">
            <div class="col-xs-8"><strong>Rounds Loaded</strong></div>
            <div id="rounds-loaded-${ammoDropdown}" class="col-xs-4 ml-auto">${rounds}</div>
          </div>
          <div class="row">
              <div class="col-xs-7"><strong>Ammo Type</strong></div>
              <div class="col-xs-5 ml-auto">
                  <div class="btn-group dropleft">
                        ${ammoDiv}
                  </div>
              </div>
          </div>
          <div class="row color-row">
            <div class="col-xs-8"><strong>Reload Time</strong></div>
            <div id="reload-time" class="col-xs-4 ml-auto">${gun.RT}</div>
          </div>
          <div class="row color-row">
            <div class="col-xs-8"></div>
            <div class="col-xs-4 ml-auto"><button id="reload-${ammoDropdown}" class="btn btn-primary btn-sm">Reload Now</button></div>
          </div>
          <div class="row">
            <div class="col-xs-8"><strong>Rate of Fire</strong></div>
            <div id="fate-of-fire" class="col-xs-4 ml-auto">${gun.ROF}</div>
          </div>
          <div class="row color-row">
            <div class="col-xs-8"><strong>Capacity</strong></div>
            <div id="capacity" class="col-xs-4 ml-auto">${gun.Cap}</div>
          </div>
          <div class="row">
            <div class="col-xs-8"><strong>Ammo Weight</strong></div>
            <div id="ammo-weight" class="col-xs-4 ml-auto">${gun.AW}</div>
          </div>
          <div class="row color-row">
            <div class="col-xs-8"><strong>${optionName}</strong></div>
            <div id="knock-down" class="col-xs-4 ml-auto">${optionValue}</div>
          </div>
          <div class="row">
            <div class="col-xs-8"><strong>Sustained Auto Burst</strong></div>
            <div id="sab" class="col-xs-4 ml-auto">${gun.SAB}</div>
          </div>
          <table class="table table-condensed table-bordered table-striped">
            <thead>
                <tr>
                    <th class="text-center">Aim Time</th>
                    <th class="text-center">Aim Time Mod</th>
                    <th class="text-center">Shot Accuracy</th>
                </tr>
            </thead>
            <tbody id="weapon-table">${aimTime}</tbody>
          </table>`
        $('#weapons').append(div)
        $(`#${ammoDropdown}`).val(ammo)
        $(`#${ammoDropdown}`).change(e => {
          let name = gun.Name
          let path = window.localStorage.getItem('firebird-command-current-character')
          let result = e.target.value
          let ammoPath = path + '/ammo/' + name + '/type/'
          Database.set(ammoPath, result)
        })
        $(`#reload-${ammoDropdown}`).click(e => {
          let cap = gun.Cap
          let name = gun.Name
          let path = window.localStorage.getItem('firebird-command-current-character')
          let ammoPath = path + '/ammo/' + name + '/loaded/'
          Database.set(ammoPath, cap)
          $(`#rounds-loaded-${ammoDropdown}`).html(cap)
        })
    })
  
}

export function submitCharacter() {
  let c = {}
  let name = $('#codename').val()
  let skillLevel = _.clamp(_.toNumber($('#skill-level').val()), 3, 18)
  let strength = _.clamp(_.toNumber($('#strength').val()), 3, 18)
  let intelligence = _.clamp(_.toNumber($('#intelligence').val()), 3, 18)
  let will = _.clamp(_.toNumber($('#will').val()), 3, 18)
  let health = _.clamp(_.toNumber($('#health').val()), 3, 18)
  let agility = _.clamp(_.toNumber($('#agility').val()), 3, 18)
  let armor = $('#armor').val()
  let weapons = Utils.selectedCheckboxes($('[name="weapon"]'))
  let equipment = Utils.selectedCheckboxes($('[name="equipment"]'))
  equipment.push(armor)
  let sal = pf.skillAccuracyLevel(skillLevel)
  let encumbrance = pf.encumbranceCalculator(equipment, weapons)
  let kv = pf.knockoutValue(will, skillLevel)
  let speed = pf.movementSpeed(strength, agility, encumbrance)
  let capi = pf.combatActionsPerImpulse(strength, agility, intelligence, skillLevel, encumbrance)
  let ammo = {}

  _.forEach(weapons, gun => {
    let ammoType = pf.getAmmoTypes(gun)
    let weapon = pf.getWeaponByName(gun)
    ammo[gun] = {
        "loaded" : weapon['Cap'],
        "total" : 99999,
        "type" : ammoType[0]
    }
  })
  
  c.name = name, c.skillLevel = skillLevel, c.strength = strength, c.intelligence = intelligence, c.will = will, c.health = health, c.agility = agility
  c.armor = armor, c.equipment = equipment, c.weapons = weapons, c.encumbrance = encumbrance, c.sal = sal, c.kv = kv, c.speed = speed, c.capi = capi
  c.ammo = ammo  

  c.pd = 0 //physical damage
  c.dt = 0 //total damage
  c.status = 'Alive'
  c.injuries = 'None'
  c.cover = 'Standing Exposed' //table 4E positions
  c.position = 'Standing' //4B - Standing, Standing & Braced, Kneeling, Kneeling & Braced, Prone, Prone & Braced
  c.stance = "False"
  c.actions = {}

  c.user = window.localStorage.getItem('firebird-command-user-id')

  Game.addCharacter(c)
}
