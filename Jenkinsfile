pipeline{
    agent any

    environment {
        APP_DIR = "/var/www/proxy-downloader"
    }
     
    stages {
        stage('Clone Repo'){
            steps {
                git branch: 'main', url: 'https://github.com/012802HJoshi/Proxy_Instagram'
            }
        }
        stage('Install Dependencies'){
            steps {
                sh 'npm install'
            }
        }
        stage('Deploy'){
            steps{
                sh '''
                mkdir -p $APP_DIR
                rsync -av --delete ./ $APP_DIR/
                cd $APP_DIR
                npm install --production
                '''
            }
        }
        stage('Restart Server') {
            steps {
                sh '''
                pm2 restart express-app || pm2 start server.js --name express-app
                '''
            }
        }
    }

}