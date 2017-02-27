/**
 * Events that can occur when any module is active (Except World. It's special.)
 **/
Events.Global = [
	
	{ /* Midterms */
		title: _('Midterms'),
		isAvailable: fuction() {
			return $SM.get('game.population') >= 20
		},
		scenes: {
			'start': {
				text: [
					_('a lot of members have midterms this week')
				],
				notification: _('midterm season'),
				blink: true,
				buttons: {
					'study': {
						text: _('let them study'),
						nextScene: 'study'
					}
				}
			},
			'study': {
				text: [
					_('school comes first.')
				],
				onLoad: function() {
					$SM.set('game.visibility', $SM.get('game.visibility') - 10)
					if ($SM.get('game.population') > $SM.get('game.visibility')) {
						room.updatePopulation()
					}
				},
				buttons: {
					'close': {
						text: _('close'),
						nextScene: 'end'
					}
				}
			}
		}
	},
	{ /* Guest Speaker */
		title: _('Guest Speaker'),
		isAvailable: true,
		scenes: {
			'start': {
				text: [
					_('a notable speaker comes to give a lecture')
				],
				notification: _('guest speaker'),
				blink: true,
				buttons: {
					'host': {
						cost: {'funds': 300}
						text: _('host the event'),
						nextScene: {0.7: 'host good', 1: 'host bad'}
					},
					'another time': {
						text: _('another time'),
						nextScene: 'end'
					}
				}
			},
			'host good': {
				text: [
					_('attendees clamour to ask questions')
				],
				onLoad: function() {
					$SM.set('game.population', $SM.get('game.population') + 6)
				},
				buttons: {
					'close': {
						text: _('close'),
						nextScene: 'end'
					}
				}
			},
			'host bad': {
				text: [
					_('the event is poorly timed')
				],
				buttons: {
					'close': {
						text: _('close'),
						nextScene: 'end'
					}
				}
			}
		}
	}
	
	{ /* National Conference */
		title: _('National Conference'),
		isAvailable: function() {
			return $SM.get('game.population') >= 15
		}
		scenes: {
			'start': {
				text: [
					_('the annual EWB national conference is being held in Toronto')
				],
				notification: _('national conference').
				blink: true,
				buttons: {
					'send five': {
						cost: {'funds': 500},
						text: _('send five person delegation'),
						nextScene: 'send five'
					},
					'send fifteen': {
						cost: {'funds': 1500},
						text: _('send fifteen person delegation'),
						nextScene: 'send fifteen'
					},
					'send zero': {
						text: _('send nobody'),
						nextScene: 'send nobody'
					}
				}
			},
			'send five': {
				text: {
					_('countless workshops and late night discussions in the hotel lobby')
				},
				onLoad: function() {
					$SM.set('game.population', $SM.get('game.population') + 5)
				},
				buttons: {
					'close': {
						text: _('close'),
						nextScene: 'end'
					}
				}
			},
			'send fifteen': {
				text: {
					_('chapter bonding in a tiny downtown restaurant')
				},
				onLoad: function() {
					$SM.set('game.population', $SM.get('game.population') + 15)
				},
				buttons: {
					'close': {
						text: _('close'),
						nextScene: 'end'
					}
				}
			},
			'send zero': {
				text: {
					_('some discontent on a missed opportunity')
				},
				onLoad: function() {
					$SM.set('game.visibility', $SM.get('game.visibility') - 5)
					if ($SM.get('game.population') > $SM.get('game.visibility')) {
						room.updatePopulation()
					}
				},
				buttons: {
					'close': {
						text: _('close'),
						nextScene: 'end'
					}
				}
			}
		}
	}
	
	{ /* The Thief */
		title: _('The Thief'),
		isAvailable: function() {
			return (Engine.activeModule == Room || Engine.activeModule == Outside) && $SM.get('game.thieves') == 1;
		},
		scenes: {
			'start': {
				text: [
					_('the villagers haul a filthy man out of the store room.'),
					_("say his folk have been skimming the supplies."),
					_('say he should be strung up as an example.')
				],
				notification: _('a thief is caught'),
				blink: true,
				buttons: {
					'kill': {
						text: _('hang him'),
						nextScene: {1: 'hang'}
					},
					'spare': {
						text: _('spare him'),
						nextScene: {1: 'spare'}
					}
				}
			},
			'hang': {
				text: [
					_('the villagers hang the thief high in front of the store room.'),
					_('the point is made. in the next few days, the missing supplies are returned.')
				],
				onLoad: function() {
					$SM.set('game.thieves', 2);
					$SM.remove('income.thieves');
					$SM.addM('stores', $SM.get('game.stolen'));
				},
				buttons: {
					'leave': {
						text: _('leave'),
						nextScene: 'end'
					}
				}
			},
			'spare': {
				text: [
					_("the man says he's grateful. says he won't come around any more."),
					_("shares what he knows about sneaking before he goes.")
				],
				onLoad: function() {
					$SM.set('game.thieves', 2);
					$SM.remove('income.thieves');
					$SM.addPerk('stealthy');
				},
				buttons: {
					'leave': {
						text: _('leave'),
						nextScene: 'end'
					}
				}
			}
		}
	}
];
