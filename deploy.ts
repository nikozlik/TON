import { Address, Cell, Dictionary, beginCell, toNano } from '@ton/core';
import { TonClient4 } from '@ton/ton';
import { TactDeployer } from '@tact-lang/compiler';
import { mnemonicToWalletKey } from '@ton/crypto'; // Этот импорт не используется в текущем скрипте, но может пригодиться
import { TonConnect, UserRejectionError } from '@tonconnect/sdk';
import * as fs from 'fs'; // Импортируем fs для чтения файлов

async function deployJetton() {
    // Используем Mainnet
    const client4 = new TonClient4({ endpoint: 'https://mainnet-v4.tonhub.com' }); 
    // Если нужно было бы тестировать в тестовой сети, использовался бы:
    // const client4 = new TonClient4({ endpoint: 'https://testnet-v4.tonhub.com' });

    // Шаг 1: Загрузка скомпилированных контрактов
    // Убедитесь, что вы уже запустили 'tact jetton-master.tact',
    // и файлы jetton_master.init.boc и jetton_wallet.init.boc находятся в папке 'build'.
    const jettonMasterCode = Cell.fromBoc(
        fs.readFileSync('build/jetton_master.init.boc')
    )[0];
    const jettonWalletCode = Cell.fromBoc(
        fs.readFileSync('build/jetton_wallet.init.boc')
    )[0];

    // Шаг 2: Введите ваш адрес Mainnet кошелька.
    // Этот адрес будет владельцем токена и будет оплачивать комиссии за развертывание.
    const ownerAddress = Address.parse('ВАШ_АДРЕС_КОШЕЛЬКА_В_MAINNET_ЗДЕСЬ'); // Пример: '0:...' или 'EQ...'

    // Шаг 3: Введите публичный URL вашего jetton-metadata.json.
    // Этот JSON файл должен быть загружен на IPFS или другой хостинг.
    const metadataUri = 'ВАШ_ПУБЛИЧНЫЙ_URL_МЕТАДАННЫХ_ЖЕТОНА_ЗДЕСЬ'; // Пример: 'https://gateway.pinata.cloud/ipfs/Qm...'

    // Инициализация Jetton Master
    // Создаем начальное состояние контракта JettonMaster
    const jettonMasterInit = await TactDeployer.wrap(jettonMasterCode, {
        owner: ownerAddress,
        jetton_wallet_code: jettonWalletCode,
        metadata_uri: metadataUri
    });

    const jettonMasterAddress = jettonMasterInit.address;
    console.log(`\n--- Информация о контракте ---`);
    console.log(`Адрес вашего будущего Jetton Master: ${jettonMasterAddress.toString()}`);
    console.log(`Вы сможете проверить его здесь: https://tonviewer.com/${jettonMasterAddress.toString()}\n`);

    const deployAmount = toNano('0.05'); // Комиссия за развертывание (обычно 0.05 - 0.1 TON хватает)

    // Использование TON Connect для подтверждения транзакции
    const connector = new TonConnect();
    
    // Попытка восстановить предыдущее подключение
    await connector.restoreConnection(); 

    if (!connector.connected) {
        console.log('Пожалуйста, подключите кошелек через TON Connect.');
        console.log('Отсканируйте QR-код или откройте ссылку в вашем кошельке:');
        console.log(connector.generateUniversalLink({
            dappMetadata: {
                url: 'https://your-dapp-url.com', // Замените на URL вашего DApp или просто на 'https://ton.org'
                name: 'Jetton Deployer'
            },
            actions: [{
                method: 'sendTransaction',
                params: [
                    JSON.stringify({
                        messages: [{
                            address: jettonMasterAddress.toString(),
                            amount: deployAmount.toString(),
                            stateInit: jettonMasterInit.stateInit.toBoc().toString('base64'),
                        }],
                        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 минут на подтверждение
                    })
                ]
            }]
        }));
        
        console.log('\nОжидаем подключения и подтверждения транзакции...');
        await new Promise<void>((resolve) => {
            connector.onStatusChange(wallet => {
                if (wallet) {
                    resolve();
                }
            });
        });
        
        console('Кошелек подключен. Отправляем транзакцию...');
    } else {
        console.log('Кошелек уже подключен.');
    }

    try {
        const result = await connector.sendTransaction({
            messages: [{
                address: jettonMasterAddress.toString(),
                amount: deployAmount.toString(),
                stateInit: jettonMasterInit.stateInit.toBoc().toString('base64'),
            }],
            validUntil: Math.floor(Date.now() / 1000) + 600, // 10 минут на подтверждение
        });
        console.log('\nТранзакция отправлена! Пожалуйста, подтвердите ее в вашем кошельке.');
        console.log(`Хэш транзакции (BOC): ${result.boc}`); // Это не совсем хэш, а BOС транзакции
        console.log(`Вы можете отслеживать транзакцию здесь (может потребоваться некоторое время для появления): https://tonviewer.com/transaction/${result.boc}`); 
        console.log('Ждем подтверждения в блокчейне...');

        // Для отслеживания статуса контракта (может потребовать более сложной логики)
        // await client4.getLastBlock(); // Просто для примера, для реального отслеживания нужен цикл

    } catch (e) {
        if (e instanceof UserRejectionError) {
            console.error('Пользователь отклонил транзакцию.');
        } else {
            console.error('Ошибка при отправке транзакции:', e);
        }
    }
}

deployJetton().catch(console.error);